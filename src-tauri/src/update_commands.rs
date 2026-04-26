//! Tauri commands and helpers for updater entry points.

use crate::error::Result as YakumoResult;
use crate::models_ext::QueryManagerExt;
use crate::updates::{UpdateMode, UpdateTrigger, YakumoUpdater};
use tauri::{Runtime, State, WebviewWindow};
use tokio::sync::Mutex;

#[tauri::command]
pub(crate) async fn cmd_check_for_updates<R: Runtime>(
    window: WebviewWindow<R>,
    yakumo_updater: State<'_, Mutex<YakumoUpdater>>,
) -> YakumoResult<bool> {
    let update_mode = get_update_mode(&window).await?;
    let settings = window.db().get_settings();
    Ok(yakumo_updater
        .lock()
        .await
        .check_now(&window, update_mode, settings.auto_download_updates, UpdateTrigger::User)
        .await?)
}

pub(crate) async fn get_update_mode<R: Runtime>(
    window: &WebviewWindow<R>,
) -> YakumoResult<UpdateMode> {
    let settings = window.db().get_settings();
    Ok(UpdateMode::new(settings.update_channel.as_str()))
}
