use serde::{Serialize, Serializer};
use thiserror::Error;
use tokio::io;

#[derive(Error, Debug)]
pub enum Error {
    #[error(transparent)]
    CryptoErr(#[from] yakumo_crypto::error::Error),

    #[error(transparent)]
    DbErr(#[from] yakumo_models::error::Error),

    #[error(transparent)]
    TemplateErr(#[from] yakumo_templates::error::Error),

    #[error("IO error: {0}")]
    IoErr(#[from] io::Error),

    #[error("Failed to send request: {0}")]
    RequestError(#[from] reqwest::Error),

    #[error("JSON error: {0}")]
    JsonErr(#[from] serde_json::Error),

    #[error("API Error: {0}")]
    ApiErr(String),

    #[error("Timeout elapsed: {0}")]
    TimeoutElapsed(#[from] tokio::time::error::Elapsed),

    #[error("Plugin not found: {0}")]
    PluginNotFoundErr(String),

    #[error("Auth plugin not found: {0}")]
    AuthPluginNotFound(String),

    #[error("Plugin error: {0}")]
    PluginErr(String),

    #[error("zip error: {0}")]
    ZipError(#[from] zip_extract::ZipExtractError),

    #[error("Client not initialized error")]
    ClientNotInitializedErr,

    #[error("Unknown event received")]
    UnknownEventErr,
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
