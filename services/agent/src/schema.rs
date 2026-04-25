use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct RouteMetadata {
    pub method: String,
    pub path: String,
    pub semantic: String,
    pub parameters: Parameters,
    pub response: ResponseShape,
    pub errors: Vec<ErrorShape>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct Parameters {
    pub path: Vec<ParameterDef>,
    pub query: Vec<ParameterDef>,
    /// JSON structure where leaf values are type names ("string", "number", "boolean");
    /// arrays use one representative element. Null if the route has no request body.
    pub body: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ParameterDef {
    pub name: String,
    #[serde(rename = "type")]
    pub param_type: String,
    pub required: bool,
    pub description: String,
    pub default_value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ResponseShape {
    pub status: u16,
    pub shape: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ErrorShape {
    pub status: u16,
    /// Typical plain-text reason phrase for this error (e.g. "not found", "invalid id").
    pub message: String,
    /// JSON structure of the error response body, using type names as leaf values.
    /// E.g. {"error": "string"} or {"code": "number", "message": "string"}.
    pub body: serde_json::Value,
}

/// Top-level extractor output for the route analysis pass.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct RouteList {
    pub routes: Vec<RouteMetadata>,
}

// ── Server request/response types ───────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct QueryRequest {
    pub query: String,
}

/// Minimal extraction target — Claude only needs to pick a route index.
#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub struct RouteMatch {
    /// Index into the routes array returned by the analyzer.
    pub matched_route_index: usize,
    /// Set to a plain-text explanation if no route can satisfy the query. Otherwise null.
    pub error: Option<String>,
}

/// What the server returns to the client.
#[derive(Debug, Serialize)]
pub struct QueryResponse {
    pub method: String,
    /// Path template with placeholders, e.g. /tasks/{id}.
    pub path: String,
    pub semantic: String,
    /// Ordered list of path parameters as they appear in the path template.
    pub path_params: Vec<ParameterDef>,
    pub query_params: Vec<ParameterDef>,
    /// JSON shape of the request body; null if the route takes no body.
    pub body_shape: serde_json::Value,
    pub response_shape: serde_json::Value,
    pub errors: Vec<ErrorShape>,
    /// Non-null when no route can satisfy the query.
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct QueryError {
    pub error: String,
}
