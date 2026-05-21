mod cli;
mod commands;
mod utils;
mod version;
mod version_check;

use clap::Parser;
use cli::{
    Cli, Commands, CookieJarArgs, CookieJarCommands, FolderArgs, FolderCommands, SendArgs,
    YakuArgs, YakuCommands, YakuRequestArgs, YakuRequestCommands,
};
use serde_json::{Value, json};
use std::path::PathBuf;
use utils::confirm::confirm_delete;
use utils::output::print_json;

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

    let data_dir = match data_dir {
        Some(data_dir) => data_dir,
        None => match resolve_data_dir(app_id) {
            Ok(data_dir) => data_dir,
            Err(error) => {
                eprintln!("Error: {error}");
                std::process::exit(1);
            }
        },
    };

    version_check::maybe_check_for_updates().await;

    if cookie_jar.is_some() {
        eprintln!("Warning: --cookie-jar is ignored by the Yaku-native CLI path");
    }
    if verbose {
        eprintln!(
            "Warning: --verbose is currently only honored by detailed run inspection commands"
        );
    }

    let exit_code = match command {
        Commands::Send(args) => run_yaku_send(data_dir, args, environment),
        Commands::CookieJar(args) => run_cookie_jar(args),
        Commands::Workspace(args) => run_yaku_core(
            data_dir,
            YakuArgs { command: YakuCommands::Workspace(args) },
            environment,
        ),
        Commands::Request(args) => {
            run_yaku_core(data_dir, YakuArgs { command: YakuCommands::Request(args) }, environment)
        }
        Commands::Folder(args) => run_yaku_folder(data_dir, args, environment),
        Commands::Environment(args) => run_yaku_core(
            data_dir,
            YakuArgs { command: YakuCommands::Environment(args) },
            environment,
        ),
        Commands::Run(args) => {
            run_yaku_core(data_dir, YakuArgs { command: YakuCommands::Run(args) }, environment)
        }
        Commands::Backup(args) => {
            run_yaku_core(data_dir, YakuArgs { command: YakuCommands::Backup(args) }, environment)
        }
        Commands::V2(args) => run_yaku_core(data_dir, args, environment),
    };

    if exit_code != 0 {
        std::process::exit(exit_code);
    }
}

fn run_yaku_core(data_dir: PathBuf, args: YakuArgs, environment: Option<String>) -> i32 {
    match std::thread::spawn(move || commands::yaku::run(data_dir, args, environment)).join() {
        Ok(exit_code) => exit_code,
        Err(_) => {
            eprintln!("Error: command failed to join blocking task");
            1
        }
    }
}

fn run_yaku_send(data_dir: PathBuf, args: SendArgs, environment: Option<String>) -> i32 {
    if args.parallel || args.fail_fast {
        eprintln!(
            "Warning: --parallel and --fail-fast are not supported by the Yaku-native send path yet"
        );
    }
    run_yaku_core(
        data_dir,
        YakuArgs { command: YakuCommands::Send { request_id: args.id } },
        environment,
    )
}

fn run_cookie_jar(args: CookieJarArgs) -> i32 {
    match args.command {
        CookieJarCommands::List { .. } => match print_json(&Vec::<Value>::new(), "cookie jar list")
        {
            Ok(()) => 0,
            Err(error) => {
                eprintln!("Error: {error}");
                1
            }
        },
    }
}

fn run_yaku_folder(data_dir: PathBuf, args: FolderArgs, environment: Option<String>) -> i32 {
    let command = match args.command {
        FolderCommands::List { workspace_id } => match workspace_id {
            Some(workspace_id) => YakuCommands::Request(YakuRequestArgs {
                command: YakuRequestCommands::List { workspace_id, cursor: None, limit: 500 },
            }),
            None => return print_error("folder list requires a workspace ID".to_string()),
        },
        FolderCommands::Schema { pretty } => return print_schema("folder", pretty),
        FolderCommands::Show { folder_id } => YakuCommands::Request(YakuRequestArgs {
            command: YakuRequestCommands::GetNode { node_id: folder_id },
        }),
        FolderCommands::Create { workspace_id, name, json } => {
            match folder_create_args(workspace_id, name, json) {
                Ok(command) => command,
                Err(error) => return print_error(error),
            }
        }
        FolderCommands::Update { .. } => {
            return print_error("folder update is not supported by the Yaku-native CLI yet; use the desktop workspace tree".to_string());
        }
        FolderCommands::Delete { folder_id, yes } => {
            if !confirm_or_abort("folder", &folder_id, yes) {
                return 0;
            }
            YakuCommands::Request(YakuRequestArgs {
                command: YakuRequestCommands::Delete { node_id: folder_id },
            })
        }
    };
    run_yaku_core(data_dir, YakuArgs { command }, environment)
}

fn folder_create_args(
    workspace_id: Option<String>,
    name: Option<String>,
    json: Option<String>,
) -> Result<YakuCommands, String> {
    let json_shorthand = workspace_id.as_deref().filter(|value| is_json(value)).map(str::to_owned);
    let workspace_id_arg = workspace_id.filter(|value| !is_json(value));
    let payload = parse_optional_payload(json, json_shorthand, "folder create")?;
    let (workspace_id, name, parent_id) = match payload {
        Some(payload) => (
            string_field(&payload, "workspaceId")?
                .or_else(|| string_field(&payload, "workspace_id").ok().flatten())
                .or(workspace_id_arg)
                .ok_or_else(|| "folder create requires workspaceId".to_string())?,
            string_field(&payload, "name")?
                .ok_or_else(|| "folder create JSON requires name".to_string())?,
            string_field(&payload, "parentId")?
                .or_else(|| string_field(&payload, "folderId").ok().flatten()),
        ),
        None => (
            workspace_id_arg.ok_or_else(|| "folder create requires a workspace ID".to_string())?,
            name.ok_or_else(|| {
                "folder create requires --name unless JSON payload is provided".to_string()
            })?,
            None,
        ),
    };
    Ok(YakuCommands::Request(YakuRequestArgs {
        command: YakuRequestCommands::CreateFolder {
            workspace_id,
            name,
            parent_id,
            sort_key: None,
        },
    }))
}

fn print_schema(kind: &str, pretty: bool) -> i32 {
    let schema = json!({
        "title": format!("Yaku {kind}"),
        "type": "object",
        "description": "Yaku-native CLI schema. Prefer explicit flags; legacy AnyModel payloads are no longer accepted.",
        "x-yaku": true,
    });
    let output =
        if pretty { serde_json::to_string_pretty(&schema) } else { serde_json::to_string(&schema) };
    match output {
        Ok(output) => {
            println!("{output}");
            0
        }
        Err(error) => print_error(format!("Failed to serialize schema: {error}")),
    }
}

fn confirm_or_abort(kind: &str, id: &str, yes: bool) -> bool {
    if yes {
        return true;
    }
    match confirm_delete(kind, id) {
        Ok(true) => true,
        Ok(false) => {
            println!("Aborted");
            false
        }
        Err(error) => {
            eprintln!("Error: {error}");
            false
        }
    }
}

fn parse_optional_payload(
    json: Option<String>,
    json_input: Option<String>,
    context: &str,
) -> Result<Option<Value>, String> {
    let Some(raw) = json.or(json_input) else {
        return Ok(None);
    };
    serde_json::from_str(&raw)
        .map(Some)
        .map_err(|error| format!("Failed to parse {context} JSON: {error}"))
}

fn string_field(payload: &Value, key: &str) -> Result<Option<String>, String> {
    match payload.get(key) {
        None | Some(Value::Null) => Ok(None),
        Some(Value::String(value)) => Ok(Some(value.clone())),
        Some(value) => Err(format!("Field '{key}' must be a string, got {value}")),
    }
}

fn is_json(value: &str) -> bool {
    value.trim_start().starts_with('{')
}

fn print_error(error: String) -> i32 {
    eprintln!("Error: {error}");
    1
}

fn resolve_data_dir(app_id: &str) -> Result<PathBuf, String> {
    if let Some(dir) = wsl_data_dir(app_id) {
        return Ok(dir);
    }
    dirs::data_dir()
        .map(|dir| dir.join(app_id))
        .ok_or_else(|| "Could not determine data directory for yaku-cli".to_string())
}

/// Detect WSL and resolve the Windows AppData\Roaming path for the Yakumo data directory.
fn wsl_data_dir(app_id: &str) -> Option<PathBuf> {
    if !cfg!(target_os = "linux") {
        return None;
    }

    let proc_version = std::fs::read_to_string("/proc/version").ok()?;
    let is_wsl = proc_version.to_lowercase().contains("microsoft");
    if !is_wsl {
        return None;
    }

    let appdata_output =
        std::process::Command::new("cmd.exe").args(["/C", "echo", "%APPDATA%"]).output().ok()?;

    let win_path = String::from_utf8(appdata_output.stdout).ok()?.trim().to_string();
    if win_path.is_empty() || win_path == "%APPDATA%" {
        return None;
    }

    let wslpath_output = std::process::Command::new("wslpath").arg(&win_path).output().ok()?;

    let wsl_appdata = String::from_utf8(wslpath_output.stdout).ok()?.trim().to_string();
    if wsl_appdata.is_empty() {
        return None;
    }

    let wsl_path = PathBuf::from(wsl_appdata).join(app_id);
    if wsl_path.exists() { Some(wsl_path) } else { None }
}
