use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Error)]
pub enum Error {
    #[error(transparent)]
    Domain(#[from] yakumo_domain::Error),

    #[error("invalid request config: {0}")]
    InvalidConfig(String),

    #[error("send failed: {0}")]
    Send(String),

    #[error("body store error: {0}")]
    BodyStore(String),

    #[error(transparent)]
    Json(#[from] serde_json::Error),
}
