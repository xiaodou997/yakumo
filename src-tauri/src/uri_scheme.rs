use crate::error::Result;
use log::{info, warn};
use tauri::{AppHandle, Manager, Runtime, Url};

pub(crate) async fn handle_deep_link<R: Runtime>(
    app_handle: &AppHandle<R>,
    url: &Url,
) -> Result<()> {
    let command = url.domain().unwrap_or_default();
    info!("Yakumo URI scheme invoked {}?{}", command, url.query().unwrap_or_default());

    let windows = app_handle.webview_windows();
    let Some((_, window)) = windows.iter().next() else {
        return Err(crate::error::Error::GenericError(
            "Cannot handle deep link before a window is available".to_string(),
        ));
    };

    _ = window.set_focus();
    warn!("Unknown deep link command: {command}");

    Ok(())
}
