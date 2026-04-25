//! Core abstractions for Yakumo that work without Tauri.
//!
//! This crate provides foundational types and traits that allow Yakumo's
//! business logic to run in both Tauri (desktop app) and CLI contexts.

mod context;
mod error;

pub use context::{AppContext, WorkspaceContext};
pub use error::{Error, Result};
