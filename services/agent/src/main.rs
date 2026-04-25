mod analyzer;
mod schema;
mod server;

use anyhow::Result;
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(
    name = "agent",
    about = "Semantic API wrapper — maps natural language queries to API routes"
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Analyze a Go backend repo and write extracted route metadata to a JSON file
    Analyze {
        #[arg(long, help = "Path to the Go backend repo")]
        path: String,
        #[arg(long, default_value = "routes.json", help = "Output JSON file")]
        output: String,
        #[arg(long, env = "ANTHROPIC_API_KEY", help = "Anthropic API key")]
        api_key: String,
    },
    /// Start the HTTP query server using a pre-analyzed routes JSON file
    Serve {
        #[arg(long, default_value = "routes.json", help = "Path to routes JSON file")]
        routes: String,
        #[arg(long, default_value = "3001", help = "Port to listen on")]
        port: u16,
        #[arg(long, env = "ANTHROPIC_API_KEY", help = "Anthropic API key")]
        api_key: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Analyze { path, output, api_key } => {
            eprintln!("Analyzing routes in {path}...");
            let routes = analyzer::analyze_repo(&path, &api_key).await?;
            let json = serde_json::to_string_pretty(&routes)?;
            std::fs::write(&output, &json)?;
            eprintln!("Wrote {} route(s) to {output}", routes.len());
        }
        Commands::Serve { routes, port, api_key } => {
            let json = std::fs::read_to_string(&routes)
                .map_err(|e| anyhow::anyhow!("Failed to read {routes}: {e}"))?;
            let route_list: Vec<schema::RouteMetadata> = serde_json::from_str(&json)?;
            eprintln!("Loaded {} route(s) from {routes}. Starting server...", route_list.len());
            server::serve(route_list, port, api_key).await?;
        }
    }

    Ok(())
}
