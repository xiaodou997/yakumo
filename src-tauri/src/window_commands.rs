//! Tauri commands for app and window lifecycle operations.

use crate::error::Result as YakumoResult;
use crate::window;
use tauri::{AppHandle, WebviewWindow};

#[tauri::command]
pub(crate) async fn cmd_restart(app_handle: AppHandle) -> YakumoResult<()> {
    app_handle.request_restart();
    Ok(())
}

#[tauri::command]
pub(crate) async fn cmd_new_child_window(
    parent_window: WebviewWindow,
    url: &str,
    label: &str,
    title: &str,
    inner_size: (f64, f64),
) -> YakumoResult<()> {
    window::create_child_window(&parent_window, url, label, title, inner_size)?;
    Ok(())
}

#[tauri::command]
pub(crate) async fn cmd_new_main_window(app_handle: AppHandle, url: &str) -> YakumoResult<()> {
    window::create_main_window(&app_handle, url)?;
    Ok(())
}
