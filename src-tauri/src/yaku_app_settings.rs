use log::warn;
use serde::Deserialize;
use tauri::{Manager, Runtime};
use yaku_store::Store;

const YAKU_APP_SETTINGS_KEY: &str = "app.settings";

#[derive(Debug, Clone, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub(crate) struct YakuAppSettings {
    pub autoupdate: bool,
    pub auto_download_updates: bool,
    pub check_notifications: bool,
    pub update_channel: String,
    pub use_native_titlebar: bool,
}

impl Default for YakuAppSettings {
    fn default() -> Self {
        Self {
            autoupdate: true,
            auto_download_updates: true,
            check_notifications: true,
            update_channel: "stable".to_string(),
            use_native_titlebar: false,
        }
    }
}

pub(crate) fn load_yaku_app_settings<R: Runtime, M: Manager<R>>(manager: &M) -> YakuAppSettings {
    match load_yaku_app_settings_result(manager) {
        Ok(settings) => settings,
        Err(err) => {
            warn!("Failed to load Yaku app settings; using defaults: {err}");
            YakuAppSettings::default()
        }
    }
}

fn load_yaku_app_settings_result<R: Runtime, M: Manager<R>>(
    manager: &M,
) -> crate::error::Result<YakuAppSettings> {
    let data_dir = manager.path().app_data_dir()?;
    let store = Store::open(data_dir.join("yaku.sqlite"))
        .map_err(|err| crate::error::Error::GenericError(err.to_string()))?;
    let Some(setting) = store
        .get_setting(YAKU_APP_SETTINGS_KEY)
        .map_err(|err| crate::error::Error::GenericError(err.to_string()))?
    else {
        return Ok(YakuAppSettings::default());
    };

    serde_json::from_value(setting.value)
        .map_err(|err| crate::error::Error::GenericError(err.to_string()))
}
