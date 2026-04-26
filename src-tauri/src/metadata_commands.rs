//! Tauri commands for application metadata.

use crate::error::Result as YakumoResult;
use tauri::{AppHandle, Manager, is_dev};
use yakumo_common::command::new_checked_command;

#[derive(serde::Serialize)]
#[serde(default, rename_all = "camelCase")]
pub(crate) struct AppMetaData {
    is_dev: bool,
    version: String,
    cli_version: Option<String>,
    name: String,
    app_data_dir: String,
    app_log_dir: String,
    default_project_dir: String,
    feature_updater: bool,
    feature_license: bool,
}

#[tauri::command]
pub(crate) async fn cmd_metadata(app_handle: AppHandle) -> YakumoResult<AppMetaData> {
    let app_data_dir = app_handle.path().app_data_dir()?;
    let app_log_dir = app_handle.path().app_log_dir()?;
    let default_project_dir = app_handle.path().home_dir()?.join("YakumoProjects");
    let cli_version = detect_cli_version().await;
    Ok(AppMetaData {
        is_dev: is_dev(),
        version: app_handle.package_info().version.to_string(),
        cli_version,
        name: app_handle.package_info().name.to_string(),
        app_data_dir: app_data_dir.to_string_lossy().to_string(),
        app_log_dir: app_log_dir.to_string_lossy().to_string(),
        default_project_dir: default_project_dir.to_string_lossy().to_string(),
        feature_license: cfg!(feature = "license"),
        feature_updater: cfg!(feature = "updater"),
    })
}

async fn detect_cli_version() -> Option<String> {
    detect_cli_version_for_binary("yaku").await
}

async fn detect_cli_version_for_binary(program: &str) -> Option<String> {
    let mut cmd = new_checked_command(program, "--version").await.ok()?;
    let out = cmd.arg("--version").output().await.ok()?;
    if !out.status.success() {
        return None;
    }

    let line = String::from_utf8(out.stdout).ok()?;
    let line = line.lines().find(|l| !l.trim().is_empty())?.trim();
    let mut parts = line.split_whitespace();
    let _name = parts.next();
    Some(parts.next().unwrap_or(line).to_string())
}
