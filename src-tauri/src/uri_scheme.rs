use crate::error::Result;
use crate::import::import_data;
use log::{info, warn};
use std::collections::HashMap;
use std::fs;
use tauri::{AppHandle, Emitter, Manager, Runtime, Url};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use yakumo_features::events::{Color, ShowToastRequest};
use yakumo_models::util::generate_id;

pub(crate) async fn handle_deep_link<R: Runtime>(
    app_handle: &AppHandle<R>,
    url: &Url,
) -> Result<()> {
    let command = url.domain().unwrap_or_default();
    info!("Yakumo URI scheme invoked {}?{}", command, url.query().unwrap_or_default());

    let query_map: HashMap<String, String> = url.query_pairs().into_owned().collect();
    let windows = app_handle.webview_windows();
    let Some((_, window)) = windows.iter().next() else {
        return Err(crate::error::Error::GenericError(
            "Cannot handle deep link before a window is available".to_string(),
        ));
    };

    match command {
        "import-data" => {
            let mut file_path = query_map.get("path").map(|s| s.to_owned());
            let name = query_map.get("name").map(|s| s.to_owned()).unwrap_or("data".to_string());
            _ = window.set_focus();

            if let Some(file_url) = query_map.get("url") {
                let confirmed_import = app_handle
                    .dialog()
                    .message(format!("Import {name} from {file_url}?"))
                    .kind(MessageDialogKind::Info)
                    .buttons(MessageDialogButtons::OkCancelCustom(
                        "Import".to_string(),
                        "Cancel".to_string(),
                    ))
                    .blocking_show();
                if !confirmed_import {
                    return Ok(());
                }

                let app_version = app_handle.package_info().version.to_string();
                let http_client =
                    yakumo_api::yakumo_api_client(yakumo_api::ApiClientKind::App, &app_version)?;
                let resp = http_client.get(file_url).send().await?;
                let json = resp.bytes().await?;
                let p = app_handle
                    .path()
                    .temp_dir()?
                    .join(format!("import-{}", generate_id()))
                    .to_string_lossy()
                    .to_string();
                fs::write(&p, json)?;
                file_path = Some(p);
            }

            let file_path = match file_path {
                Some(p) => p,
                None => {
                    app_handle.emit(
                        "show_toast",
                        ShowToastRequest {
                            message: "Failed to import data".to_string(),
                            color: Some(Color::Danger),
                            icon: None,
                            timeout: None,
                        },
                    )?;
                    return Ok(());
                }
            };

            let results = import_data(window, &file_path).await?;
            window.emit(
                "show_toast",
                ShowToastRequest {
                    message: format!("Imported data for {} workspaces", results.workspaces.len()),
                    color: Some(Color::Success),
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
