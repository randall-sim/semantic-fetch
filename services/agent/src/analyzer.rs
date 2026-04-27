use anyhow::Result;
use rig::client::CompletionClient;
use rig::providers::anthropic;
use walkdir::WalkDir;

use crate::schema::{RouteList, RouteMetadata};

const MODEL: &str = "claude-sonnet-4-6";

pub async fn analyze_repo(path: &str, api_key: &str) -> Result<Vec<RouteMetadata>> {
    let source = collect_go_sources(path)?;

    let client = anthropic::Client::new(api_key)?;
    let extractor = client
        .extractor::<RouteList>(MODEL)
        .preamble(
            "You are an expert Go backend API analyzer. Extract every HTTP route from the \
             provided Go source code and return structured metadata for each one.\n\n\
             For each route provide:\n\
             - method: HTTP method (GET, POST, PUT, PATCH, DELETE, etc.)\n\
             - path: URL path pattern exactly as registered (e.g. /tasks or /tasks/{id})\n\
             - semantic: clear natural-language description of what the route does\n\
             - parameters.path: path parameters extracted from {placeholder} segments\n\
             - parameters.query: query string parameters read via r.URL.Query()\n\
             - parameters.headers: HTTP request headers the route reads or requires \
               (look for r.Header.Get calls, Authorization checks, middleware that reads \
               specific headers, etc.); each entry has the same shape as a ParameterDef \
               (name, type \"string\", required, description, default_value); \
               return an empty array if the route reads no custom or auth headers\n\
             - parameters.body: a JSON shape object representing the decoded request body, \
               where every key is a field name and every leaf value is a type name \
               (\"string\", \"number\", \"boolean\"); use an array with one representative \
               element for array fields (e.g. [\"string\"] or [{\"id\": \"number\"}]); \
               use null if the route reads no request body\n\
             - response.status: HTTP success status code\n\
             - response.shape: JSON structure where leaf values are type names \
               (\"string\", \"number\", \"boolean\"); arrays use one representative element\n\
             - errors: all error responses; for each provide:\n\
                 * status: HTTP error status code\n\
                 * message: typical plain-text reason phrase (e.g. \"not found\")\n\
                 * body: JSON shape of the error response body using type-name leaf values \
                   (e.g. {\"error\": \"string\"} or {\"code\": \"number\", \"message\": \"string\"})\n\n\
             If a parameter list is empty, return an empty array. Be thorough and precise.",
        )
        .build();

    let prompt = format!(
        "Extract all HTTP routes from these Go source files:\n\n{}",
        source
    );

    let route_list = extractor.extract(&prompt).await?;
    Ok(route_list.routes)
}

fn collect_go_sources(path: &str) -> Result<String> {
    let mut combined = String::new();

    for entry in WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_type().is_file()
                && e.path().extension().map_or(false, |ext| ext == "go")
        })
    {
        let content = std::fs::read_to_string(entry.path())?;
        combined.push_str(&format!(
            "// === {} ===\n{}\n\n",
            entry.path().display(),
            content
        ));
    }

    anyhow::ensure!(
        !combined.is_empty(),
        "No Go source files found at path: {path}"
    );

    Ok(combined)
}
