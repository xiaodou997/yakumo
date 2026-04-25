mod cli;
mod commands;
mod context;
mod utils;
mod version;
mod version_check;

use clap::Parser;
use cli::{Cli, Commands, RequestCommands};
use context::CliContext;
use std::path::PathBuf;
use yaak_models::queries::any_request::AnyRequest;

#[tokio::main]
async fn main() {
    let Cli { data_dir, environment, cookie_jar, verbose, log, command } = Cli::parse();

    if let Some(log_level) = log {
        match log_level {
            Some(level) => {
                env_logger::Builder::new().filter_level(level.as_filter()).init();
            }
            None => {
                env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
                    .init();
            }
        }
    }

    let app_id =
        if cfg!(debug_assertions) { "app.yakumo.desktop.dev" } else { "app.yakumo.desktop" };

    let data_dir = data_dir.unwrap_or_else(|| resolve_data_dir(app_id));

    version_check::maybe_check_for_updates().await;

    let exit_code = match command {
        Commands::Send(args) => {
            let context = CliContext::new(data_dir.clone(), app_id);
            match validate_send_execution_context(
                &context,
                &args.id,
                environment.as_deref(),
                cookie_jar.as_deref(),
            ) {
                Ok(()) => {
                    let exit_code = commands::send::run(
                        &context,
                        args,
                        environment.as_deref(),
                        cookie_jar.as_deref(),
                        verbose,
                    )
                    .await;
                    context.shutdown().await;
                    exit_code
                }
                Err(error) => {
                    eprintln!("Error: {error}");
                    1
                }
            }
        }
        Commands::CookieJar(args) => {
            let context = CliContext::new(data_dir.clone(), app_id);
            let exit_code = commands::cookie_jar::run(&context, args);
            context.shutdown().await;
            exit_code
        }
        Commands::Workspace(args) => {
            let context = CliContext::new(data_dir.clone(), app_id);
            let exit_code = commands::workspace::run(&context, args);
            context.shutdown().await;
            exit_code
        }
        Commands::Request(args) => {
            let context = CliContext::new(data_dir.clone(), app_id);
            let execution_context_result = match &args.command {
                RequestCommands::Send { request_id } => validate_request_execution_context(
                    &context,
                    request_id,
                    environment.as_deref(),
                    cookie_jar.as_deref(),
                ),
                _ => Ok(()),
            };
            match execution_context_result {
                Ok(()) => {
                    let exit_code = commands::request::run(
                        &context,
                        args,
                        environment.as_deref(),
                        cookie_jar.as_deref(),
                        verbose,
                    )
                    .await;
                    context.shutdown().await;
                    exit_code
                }
                Err(error) => {
                    eprintln!("Error: {error}");
                    1
                }
            }
        }
        Commands::Folder(args) => {
            let context = CliContext::new(data_dir.clone(), app_id);
            let exit_code = commands::folder::run(&context, args);
            context.shutdown().await;
            exit_code
        }
        Commands::Environment(args) => {
            let context = CliContext::new(data_dir.clone(), app_id);
            let exit_code = commands::environment::run(&context, args);
            context.shutdown().await;
            exit_code
        }
    };

    if exit_code != 0 {
        std::process::exit(exit_code);
    }
}

fn validate_send_execution_context(
    context: &CliContext,
    id: &str,
    environment: Option<&str>,
    explicit_cookie_jar_id: Option<&str>,
) -> Result<(), String> {
    let _ = environment;
    if let Ok(request) = context.db().get_any_request(id) {
        let workspace_id = match request {
            AnyRequest::HttpRequest(r) => r.workspace_id,
            AnyRequest::GrpcRequest(r) => r.workspace_id,
            AnyRequest::WebsocketRequest(r) => r.workspace_id,
        };
        resolve_cookie_jar_id(context, &workspace_id, explicit_cookie_jar_id)?;
        return Ok(());
    }

    if let Ok(folder) = context.db().get_folder(id) {
        resolve_cookie_jar_id(context, &folder.workspace_id, explicit_cookie_jar_id)?;
        return Ok(());
    }

    if let Ok(workspace) = context.db().get_workspace(id) {
        resolve_cookie_jar_id(context, &workspace.id, explicit_cookie_jar_id)?;
        return Ok(());
    }

    Err(format!("Could not resolve ID '{}' as request, folder, or workspace", id))
}

fn validate_request_execution_context(
    context: &CliContext,
    request_id: &str,
    environment: Option<&str>,
    explicit_cookie_jar_id: Option<&str>,
) -> Result<(), String> {
    let _ = environment;
    let request = context
        .db()
        .get_any_request(request_id)
        .map_err(|e| format!("Failed to get request: {e}"))?;

    let workspace_id = match request {
        AnyRequest::HttpRequest(r) => r.workspace_id,
        AnyRequest::GrpcRequest(r) => r.workspace_id,
        AnyRequest::WebsocketRequest(r) => r.workspace_id,
    };
    resolve_cookie_jar_id(context, &workspace_id, explicit_cookie_jar_id)?;

    Ok(())
}

fn resolve_cookie_jar_id(
    context: &CliContext,
    workspace_id: &str,
    explicit_cookie_jar_id: Option<&str>,
) -> Result<Option<String>, String> {
    if let Some(cookie_jar_id) = explicit_cookie_jar_id {
        return Ok(Some(cookie_jar_id.to_string()));
    }

    let default_cookie_jar = context
        .db()
        .list_cookie_jars(workspace_id)
        .map_err(|e| format!("Failed to list cookie jars: {e}"))?
        .into_iter()
        .min_by_key(|jar| jar.created_at)
        .map(|jar| jar.id);
    Ok(default_cookie_jar)
}

fn resolve_data_dir(app_id: &str) -> PathBuf {
    if let Some(dir) = wsl_data_dir(app_id) {
        return dir;
    }
    dirs::data_dir().expect("Could not determine data directory").join(app_id)
}

/// Detect WSL and resolve the Windows AppData\Roaming path for the Yaak data directory.
fn wsl_data_dir(app_id: &str) -> Option<PathBuf> {
    if !cfg!(target_os = "linux") {
        return None;
    }

    let proc_version = std::fs::read_to_string("/proc/version").ok()?;
    let is_wsl = proc_version.to_lowercase().contains("microsoft");
    if !is_wsl {
        return None;
    }

    // We're in WSL, so try to resolve the Yaak app's data directory in Windows

    // Get the Windows %APPDATA% path via cmd.exe
    let appdata_output =
        std::process::Command::new("cmd.exe").args(["/C", "echo", "%APPDATA%"]).output().ok()?;

    let win_path = String::from_utf8(appdata_output.stdout).ok()?.trim().to_string();
    if win_path.is_empty() || win_path == "%APPDATA%" {
        return None;
    }

    // Convert Windows path to WSL path using wslpath (handles custom mount points)
    let wslpath_output = std::process::Command::new("wslpath").arg(&win_path).output().ok()?;

    let wsl_appdata = String::from_utf8(wslpath_output.stdout).ok()?.trim().to_string();
    if wsl_appdata.is_empty() {
        return None;
    }

    let wsl_path = PathBuf::from(wsl_appdata).join(app_id);

    if wsl_path.exists() { Some(wsl_path) } else { None }
}
