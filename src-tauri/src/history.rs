use crate::yaku_app_settings::{open_yaku_store, upsert_yaku_setting};
use chrono::{NaiveDateTime, Utc};
use log::debug;
use serde::de::DeserializeOwned;
use serde_json::json;
use std::sync::OnceLock;
use tauri::{AppHandle, Runtime};
use yaku_store::Store;

const NUM_LAUNCHES_KEY: &str = "num_launches";
const LAST_VERSION_KEY: &str = "last_tracked_version";
const PREV_VERSION_KEY: &str = "last_tracked_version_prev";
const VERSION_SINCE_KEY: &str = "last_tracked_version_since";
const USER_SINCE_KEY: &str = "user_since";

#[derive(Default, Debug, Clone)]
pub struct LaunchEventInfo {
    pub current_version: String,
    pub previous_version: String,
    pub launched_after_update: bool,
    pub version_since: NaiveDateTime,
    pub user_since: NaiveDateTime,
    pub num_launches: i32,
}

static LAUNCH_INFO: OnceLock<LaunchEventInfo> = OnceLock::new();

pub fn get_or_upsert_launch_info<R: Runtime>(app_handle: &AppHandle<R>) -> &LaunchEventInfo {
    LAUNCH_INFO.get_or_init(|| {
        let now = Utc::now().naive_utc();
        let store = open_yaku_store(app_handle).expect("Failed to open Yaku store");
        let mut info = LaunchEventInfo {
            version_since: get_history_value(&store, VERSION_SINCE_KEY).unwrap_or(now),
            current_version: app_handle.package_info().version.to_string(),
            user_since: get_history_value(&store, USER_SINCE_KEY).unwrap_or(now),
            num_launches: get_history_value::<i32>(&store, NUM_LAUNCHES_KEY).unwrap_or(0) + 1,

            // The rest will be set below
            ..Default::default()
        };

        let curr_db = get_history_value::<String>(&store, LAST_VERSION_KEY).unwrap_or_default();
        let prev_db = get_history_value::<String>(&store, PREV_VERSION_KEY).unwrap_or_default();
        if !curr_db.is_empty() && info.current_version != curr_db {
            info.launched_after_update = true;
        }
        if info.launched_after_update {
            info.previous_version = curr_db;
            info.version_since = now;
        } else {
            info.previous_version = prev_db;
        }

        set_history_value(&store, PREV_VERSION_KEY, json!(info.previous_version));
        set_history_value(&store, LAST_VERSION_KEY, json!(info.current_version));
        set_history_value(&store, VERSION_SINCE_KEY, json!(info.version_since));
        set_history_value(&store, USER_SINCE_KEY, json!(info.user_since));
        set_history_value(&store, NUM_LAUNCHES_KEY, json!(info.num_launches));

        debug!("Initialized launch info");

        info
    })
}

fn get_history_value<T: DeserializeOwned>(store: &Store, key: &str) -> Option<T> {
    store
        .get_setting(&history_key(key))
        .ok()
        .flatten()
        .and_then(|setting| serde_json::from_value(setting.value).ok())
}

fn set_history_value(store: &Store, key: &str, value: serde_json::Value) {
    if let Err(err) = upsert_yaku_setting(store, &history_key(key), value) {
        log::warn!("Failed to persist launch history setting {key}: {err}");
    }
}

fn history_key(key: &str) -> String {
    format!("app.analytics.{key}")
}
