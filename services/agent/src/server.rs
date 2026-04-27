use std::sync::Arc;

use anyhow::Result;
use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use rig::client::CompletionClient;
use rig::providers::anthropic;
use tower_http::cors::CorsLayer;

use crate::schema::{QueryError, QueryRequest, QueryResponse, RouteMatch, RouteMetadata};

const MODEL: &str = "claude-sonnet-4-6";

#[derive(Clone)]
struct AppState {
    routes: Arc<Vec<RouteMetadata>>,
    api_key: String,
}

pub async fn serve(routes: Vec<RouteMetadata>, port: u16, api_key: String) -> Result<()> {
    let state = AppState {
        routes: Arc::new(routes),
        api_key,
    };

    let app = Router::new()
        .route("/query", post(query_handler))
        .route("/routes", get(routes_handler))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = format!("0.0.0.0:{port}");
    println!("Agent server running on http://{addr}");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn query_handler(
    State(state): State<AppState>,
    Json(req): Json<QueryRequest>,
) -> Result<Json<QueryResponse>, (StatusCode, Json<QueryError>)> {
    let api_key = &state.api_key;
    // Build a compact index so Claude can reference routes by number.
    let index_lines: Vec<String> = state
        .routes
        .iter()
        .enumerate()
        .map(|(i, r)| format!("  [{i}] {} {} — {}", r.method, r.path, r.semantic))
        .collect();
    let route_index = index_lines.join("\n");

    let routes_json =
        serde_json::to_string_pretty(&*state.routes).map_err(|e| server_err(e.to_string()))?;

    let client = anthropic::Client::new(api_key).map_err(|e| server_err(e.to_string()))?;
    let extractor = client
        .extractor::<RouteMatch>(MODEL)
        .preamble(
            "You are a semantic API routing agent. Given a numbered list of API routes and a \
             natural language query, identify the index of the single best matching route.\n\n\
             Output fields:\n\
             - matched_route_index: integer index of the best matching route\n\
             - error: if no route is a reasonable match for the query, set this to a brief \
               plain-text explanation. Otherwise null.",
        )
        .build();

    let prompt = format!(
        "Route index:\n{}\n\nFull route details:\n{}\n\n\
         Client query: \"{}\"",
        route_index,
        routes_json,
        req.query,
    );

    let route_match = extractor
        .extract(&prompt)
        .await
        .map_err(|e| server_err(e.to_string()))?;

    let matched_route = state
        .routes
        .get(route_match.matched_route_index)
        .ok_or_else(|| {
            server_err(format!(
                "Claude returned out-of-bounds route index {}",
                route_match.matched_route_index
            ))
        })?
        .clone();

    Ok(Json(QueryResponse {
        method: matched_route.method,
        path: matched_route.path,
        semantic: matched_route.semantic,
        path_params: matched_route.parameters.path,
        query_params: matched_route.parameters.query,
        headers: matched_route.parameters.headers,
        body_shape: matched_route.parameters.body,
        response_shape: matched_route.response.shape,
        errors: matched_route.errors,
        error: route_match.error,
    }))
}


async fn routes_handler(State(state): State<AppState>) -> Json<Vec<RouteMetadata>> {
    Json((*state.routes).clone())
}

fn server_err(msg: String) -> (StatusCode, Json<QueryError>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(QueryError { error: msg }),
    )
}
