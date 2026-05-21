use crate::error::Result;
use crate::history::get_or_upsert_launch_info;
use crate::yaku_app_settings::{load_yaku_app_settings, open_yaku_store, upsert_yaku_setting};
use chrono::{DateTime, Utc};
use log::{debug, info};
use reqwest::Method;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager, Runtime, State, WebviewWindow};
use tokio::sync::Mutex;
use ts_rs::TS;
use yakumo_api::{ApiClientKind, yakumo_api_client};
use yakumo_common::platform::get_os_str;

// Check for updates every hour
const MAX_UPDATE_CHECK_SECONDS: u64 = 60 * 60;

const NOTIFICATIONS_SEEN_KEY: &str = "app.notifications.seen";

// Create updater struct
pub struct YakumoNotifier {
    last_check: Option<Instant>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[serde(default, rename_all = "camelCase")]
#[ts(export, export_to = "index.ts")]
pub struct YakumoNotification {
    timestamp: DateTime<Utc>,
    timeout: Option<f64>,
    id: String,
    title: Option<String>,
    message: String,
    color: Option<String>,
    action: Option<YakumoNotificationAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[serde(default, rename_all = "camelCase")]
#[ts(export, export_to = "index.ts")]
pub struct YakumoNotificationAction {
    label: String,
    url: String,
}

impl YakumoNotifier {
    pub fn new() -> Self {
        Self { last_check: None }
    }

    pub async fn seen<R: Runtime>(&mut self, window: &WebviewWindow<R>, id: &str) -> Result<()> {
        let app_handle = window.app_handle();
        let mut seen = get_kv(app_handle).await?;
        seen.push(id.to_string());
        debug!("Marked notification as seen {}", id);
        let store = open_yaku_store(app_handle)?;
        upsert_yaku_setting(&store, NOTIFICATIONS_SEEN_KEY, serde_json::json!(seen))?;
        Ok(())
    }

    pub async fn maybe_check<R: Runtime>(&mut self, window: &WebviewWindow<R>) -> Result<()> {
        let app_handle = window.app_handle();
        if let Some(i) = self.last_check
            && i.elapsed().as_secs() < MAX_UPDATE_CHECK_SECONDS
        {
            return Ok(());
        }

        self.last_check = Some(Instant::now());

        if !load_yaku_app_settings(app_handle).check_notifications {
            info!("Notifications are disabled. Skipping check.");
            return Ok(());
        }

        debug!("Checking for notifications");

        let license_check = "disabled".to_string();

        let launch_info = get_or_upsert_launch_info(app_handle);
        let app_version = app_handle.package_info().version.to_string();
        let req = yakumo_api_client(ApiClientKind::App, &app_version)?
            .request(Method::GET, "https://notify.yakumo.local/notifications")
            .query(&[
                ("version", &launch_info.current_version),
                ("version_prev", &launch_info.previous_version),
                ("launches", &launch_info.num_launches.to_string()),
                ("installed", &launch_info.user_since.format("%Y-%m-%d").to_string()),
                ("license", &license_check),
                ("updates", &get_updater_status(app_handle).to_string()),
                ("platform", &get_os_str().to_string()),
            ]);
        let resp = req.send().await?;
        if resp.status() != 200 {
            debug!("Skipping notification status code {}", resp.status());
            return Ok(());
        }

        for notification in resp.json::<Vec<YakumoNotification>>().await? {
            let seen = get_kv(app_handle).await?;
            if seen.contains(&notification.id) {
                debug!("Already seen notification {}", notification.id);
                continue;
            }
            debug!("Got notification {:?}", notification);

            let _ = app_handle.emit_to(window.label(), "notification", notification.clone());
            break; // Only show one notification
        }

        Ok(())
    }
}

#[tauri::command]
pub(crate) async fn cmd_dismiss_notification<R: Runtime>(
    window: WebviewWindow<R>,
    notification_id: &str,
    yakumo_notifier: State<'_, Mutex<YakumoNotifier>>,
) -> Result<()> {
    Ok(yakumo_notifier.lock().await.seen(&window, notification_id).await?)
}

async fn get_kv<R: Runtime>(app_handle: &AppHandle<R>) -> Result<Vec<String>> {
    let store = open_yaku_store(app_handle)?;
    let Some(setting) = store
        .get_setting(NOTIFICATIONS_SEEN_KEY)
        .map_err(|err| crate::error::Error::GenericError(err.to_string()))?
    else {
        return Ok(Vec::new());
    };
    Ok(serde_json::from_value(setting.value)?)
}

#[allow(unused)]
fn get_updater_status<R: Runtime>(app_handle: &AppHandle<R>) -> &'static str {
    #[cfg(not(feature = "updater"))]
    {
        // Updater is not enabled as a Rust feature
        return "missing";
    }

    #[cfg(all(feature = "updater", target_os = "linux"))]
    {
        let settings = load_yaku_app_settings(app_handle);
        if !settings.autoupdate {
            // Updates are explicitly disabled
            "disabled"
        } else if std::env::var("APPIMAGE").is_err() {
            // Updates are enabled, but unsupported
            "unsupported"
        } else {
            // Updates are enabled and supported
            "enabled"
        }
    }

    #[cfg(all(feature = "updater", not(target_os = "linux")))]
    {
        let settings = load_yaku_app_settings(app_handle);
        if settings.autoupdate { "enabled" } else { "disabled" }
    }
}
