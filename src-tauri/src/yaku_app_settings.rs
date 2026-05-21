use log::warn;
use serde::Deserialize;
use tauri::{Manager, Runtime};
use yaku_domain::Setting;
use yaku_store::Store;

const YAKU_APP_SETTINGS_KEY: &str = "app.settings";
const YAKU_INSTALL_ID_KEY: &str = "app.installId";

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
    let store = open_yaku_store(manager)?;
    let Some(setting) = store
        .get_setting(YAKU_APP_SETTINGS_KEY)
        .map_err(|err| crate::error::Error::GenericError(err.to_string()))?
    else {
        return Ok(YakuAppSettings::default());
    };

    serde_json::from_value(setting.value)
        .map_err(|err| crate::error::Error::GenericError(err.to_string()))
}

pub(crate) fn load_yaku_install_id<R: Runtime, M: Manager<R>>(
    manager: &M,
) -> crate::error::Result<String> {
    let store = open_yaku_store(manager)?;
    if let Some(setting) = store
        .get_setting(YAKU_INSTALL_ID_KEY)
        .map_err(|err| crate::error::Error::GenericError(err.to_string()))?
        && let Some(id) = setting.value.as_str()
        && !id.is_empty()
    {
        return Ok(id.to_string());
    }

    let id = uuid::Uuid::new_v4().simple().to_string();
    upsert_yaku_setting(&store, YAKU_INSTALL_ID_KEY, serde_json::json!(id))?;
    Ok(id)
}

pub(crate) fn open_yaku_store<R: Runtime, M: Manager<R>>(
    manager: &M,
) -> crate::error::Result<Store> {
    let data_dir = manager.path().app_data_dir()?;
    std::fs::create_dir_all(&data_dir)?;
    Store::open(data_dir.join("yaku.sqlite"))
        .map_err(|err| crate::error::Error::GenericError(err.to_string()))
}

pub(crate) fn upsert_yaku_setting(
    store: &Store,
    key: &str,
    value: serde_json::Value,
) -> crate::error::Result<()> {
    store
        .upsert_setting(&Setting { key: key.to_string(), value, updated_at: chrono::Utc::now() })
        .map_err(|err| crate::error::Error::GenericError(err.to_string()))
}
