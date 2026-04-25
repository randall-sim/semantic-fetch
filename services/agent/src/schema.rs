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
    pub body: Vec<ParameterDef>,
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
    pub message: String,
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
    pub parameters: serde_json::Value,
}

/// What Claude returns when mapping a query to a route.
#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub struct MappingResult {
    /// Index into the routes array returned by the analyzer.
    pub matched_route_index: usize,
    /// Human-readable explanation of how the client's params map to API params,
    /// including any gaps or required transformations.
    pub instructions: String,
    /// Populated path parameter values (e.g. {"id": 5}).
    pub path_params: serde_json::Value,
    /// Populated query parameter values.
    pub query_params: serde_json::Value,
    /// Populated request body, or null if none needed.
    pub body: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct QueryResponse {
    pub matched_route: RouteMetadata,
    pub parameter_mapping: MappingResult,
    /// Path with placeholders substituted (e.g. /tasks/5).
    pub resolved_path: String,
    pub expected_response_shape: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct QueryError {
    pub error: String,
}
