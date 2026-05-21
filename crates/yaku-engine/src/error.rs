use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Error)]
pub enum Error {
    #[error(transparent)]
    Domain(#[from] yaku_domain::Error),

    #[error("invalid request config: {0}")]
    InvalidConfig(String),

    #[error("send failed: {0}")]
    Send(String),

    #[error("send cancelled")]
    Cancelled,

    #[error("body store error: {0}")]
    BodyStore(String),

    #[error(transparent)]
    Json(#[from] serde_json::Error),
}

impl Error {
    pub fn is_cancelled(&self) -> bool {
        matches!(self, Error::Cancelled)
    }
}
