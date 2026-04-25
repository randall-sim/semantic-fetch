use std::sync::Arc;

use anyhow::Result;
use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::post,
    Router,
};
use rig::providers::anthropic;
use tower_http::cors::CorsLayer;

use crate::schema::{MappingResult, QueryError, QueryRequest, QueryResponse, RouteMetadata};

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

    let client = anthropic::ClientBuilder::new(&state.api_key).build();
    let extractor = client
        .extractor::<MappingResult>(MODEL)
        .preamble(
            "You are a semantic API routing agent. Given a list of API routes and a client's \
             natural language query with their provided parameters, identify the best matching \
             route and produce a parameter mapping.\n\n\
             Output fields:\n\
             - matched_route_index: integer index of the best matching route\n\
             - instructions: explain how the client's params map to the API's params, \
               call out any missing required params or needed transformations\n\
             - path_params: object with values for path placeholders (e.g. {\"id\": 5}), \
               or null if none\n\
             - query_params: object with populated query params, or null if none\n\
             - body: object with the request body fields, or null if the route has no body\n\n\
             Use JSON null (not an empty object) when a params field is unused.",
        )
        .build();

    let prompt = format!(
        "Route index:\n{route_index}\n\nFull route details:\n{routes_json}\n\n\
         Client query: \"{}\"\nClient parameters: {}",
        req.query,
        serde_json::to_string_pretty(&req.parameters).unwrap_or_else(|_| "{}".to_string()),
    );

    let mapping = extractor
        .extract(&prompt)
        .await
        .map_err(|e| server_err(e.to_string()))?;

    let matched_route = state
        .routes
        .get(mapping.matched_route_index)
        .ok_or_else(|| {
            server_err(format!(
                "Claude returned out-of-bounds route index {}",
                mapping.matched_route_index
            ))
        })?
        .clone();

    let resolved_path = resolve_path(&matched_route.path, &mapping.path_params);
    let expected_response_shape = matched_route.response.shape.clone();

    Ok(Json(QueryResponse {
        matched_route,
        resolved_path,
        expected_response_shape,
        parameter_mapping: mapping,
    }))
}

/// Substitute path placeholder values into a path template.
/// e.g. resolve_path("/tasks/{id}", {"id": 5}) => "/tasks/5"
fn resolve_path(template: &str, path_params: &serde_json::Value) -> String {
    let mut resolved = template.to_string();
    if let Some(obj) = path_params.as_object() {
        for (key, val) in obj {
            let placeholder = format!("{{{key}}}");
            let value = match val {
                serde_json::Value::String(s) => s.clone(),
                other => other.to_string(),
            };
            resolved = resolved.replace(&placeholder, &value);
        }
    }
    resolved
}

fn server_err(msg: String) -> (StatusCode, Json<QueryError>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(QueryError { error: msg }),
    )
}
