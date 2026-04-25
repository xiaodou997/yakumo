use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("Render error: {0}")]
    Render(String),

    #[error("Template error: {0}")]
    Template(#[from] yakumo_templates::error::Error),
}

pub type Result<T> = std::result::Result<T, Error>;
