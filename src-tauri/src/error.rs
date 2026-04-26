use serde::{Serialize, Serializer};
use std::io;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error(transparent)]
    TemplateError(#[from] yakumo_templates::error::Error),

    #[error(transparent)]
    ModelError(#[from] yakumo_models::error::Error),

    #[error(transparent)]
    SyncError(#[from] yakumo_sync::error::Error),

    #[error(transparent)]
    CryptoError(#[from] yakumo_crypto::error::Error),

    #[error(transparent)]
    HttpError(#[from] yakumo_http::error::Error),

    #[error(transparent)]
    GitError(#[from] yakumo_git::error::Error),

    #[error(transparent)]
    TokioTimeoutElapsed(#[from] tokio::time::error::Elapsed),

    #[error(transparent)]
    WebsocketError(#[from] yakumo_ws::error::Error),

    #[cfg(feature = "license")]
    #[error(transparent)]
    LicenseError(#[from] yakumo_license::error::Error),

    #[error(transparent)]
    FeatureError(#[from] yakumo_features::error::Error),

    #[error(transparent)]
    ApiError(#[from] yakumo_api::Error),

    #[error(transparent)]
    ClipboardError(#[from] tauri_plugin_clipboard_manager::Error),

    #[error(transparent)]
    OpenerError(#[from] tauri_plugin_opener::Error),

    #[error("Updater error: {0}")]
    UpdaterError(#[from] tauri_plugin_updater::Error),

    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::error::Error),

    #[error("Tauri error: {0}")]
    TauriError(#[from] tauri::Error),

    #[error("Event source error: {0}")]
    EventSourceError(#[from] eventsource_client::Error),

    #[error("I/O error: {0}")]
    IOError(#[from] io::Error),

    #[error("Request error: {0}")]
    RequestError(#[from] reqwest::Error),

    #[error("{0}")]
    GenericError(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub type Result<T> = std::result::Result<T, Error>;
