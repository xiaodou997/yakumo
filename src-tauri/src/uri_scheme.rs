use crate::error::Result;
use crate::events::{ShowToastRequest, ToastColor};
use log::{info, warn};
use tauri::{AppHandle, Emitter, Manager, Runtime, Url};

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

    match command {
        "import-data" => {
            _ = window.set_focus();
            window.emit(
                "show_toast",
                ShowToastRequest {
                    message: "Legacy import links are disabled in the Yaku workspace. Use Yaku backup import instead.".to_string(),
                    color: Some(ToastColor::Danger),
                    icon: None,
                    timeout: Some(5000),
                },
            )?;
        }
        _ => {
            warn!("Unknown deep link command: {command}");
        }
    }

    Ok(())
}
