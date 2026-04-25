//! Import modules for Yakumo API.
//!
//! This module provides built-in import functionality
//! that were previously implemented as plugins.

pub mod curl;
pub mod yakumo;

// TODO: Implement these modules
// pub mod postman;
// pub mod openapi;
// pub mod insomnia;
// pub mod postman_env;

use crate::events::ImportResponse;

/// Import data based on content detection.
pub fn import(content: &str) -> Result<Option<ImportResponse>, String> {
    // Try curl first (starts with "curl")
    if content.trim().starts_with("curl") {
        if let Some(result) = curl::import_curl(content)? {
            return Ok(Some(result));
        }
    }

    // Try Yakumo workspace export format.
    if let Some(result) = yakumo::import_yakumo(content)? {
        return Ok(Some(result));
    }

    // TODO: Add other importers
    // - postman
    // - openapi

    Ok(None)
}
