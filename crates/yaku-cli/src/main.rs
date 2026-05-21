mod cli;
mod commands;
mod utils;
mod version;
mod version_check;

use clap::Parser;
use cli::{Cli, Commands, SendArgs, YakuCommands};
use std::path::PathBuf;

#[tokio::main]
async fn main() {
    let Cli { data_dir, environment, verbose, log, command } = Cli::parse();

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

    if verbose {
        eprintln!(
            "Warning: --verbose is currently only honored by detailed run inspection commands"
        );
    }

    let exit_code = match command {
        Commands::Send(args) => run_yaku_send(data_dir, args, environment),
        Commands::Workspace(args) => {
            run_yaku_core(data_dir, YakuCommands::Workspace(args), environment)
        }
        Commands::Request(args) => {
            run_yaku_core(data_dir, YakuCommands::Request(args), environment)
        }
        Commands::Folder(args) => run_yaku_core(data_dir, YakuCommands::Folder(args), environment),
        Commands::Environment(args) => {
            run_yaku_core(data_dir, YakuCommands::Environment(args), environment)
        }
        Commands::Run(args) => run_yaku_core(data_dir, YakuCommands::Run(args), environment),
        Commands::Backup(args) => run_yaku_core(data_dir, YakuCommands::Backup(args), environment),
    };

    if exit_code != 0 {
        std::process::exit(exit_code);
    }
}

fn run_yaku_core(data_dir: PathBuf, command: YakuCommands, environment: Option<String>) -> i32 {
    match std::thread::spawn(move || commands::yaku::run(data_dir, command, environment)).join() {
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
    run_yaku_core(data_dir, YakuCommands::Send { request_id: args.id }, environment)
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
