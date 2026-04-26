//! Template functions for Yakumo API.
//!
//! This module provides built-in template functions
//! implemented as native Yakumo features.

pub mod encode;
pub mod hash;
pub mod jsonpath;
pub mod random;
pub mod regex;
pub mod timestamp;
pub mod uuid;

// TODO: Implement these modules
// pub mod prompt;
// pub mod cookie;
// pub mod request;
// pub mod response;
// pub mod ctx;
// pub mod fs;
// pub mod xml;

use crate::events::TemplateFunction;

/// Template function trait for all implementations.
pub trait TemplateFunc {
    /// Get the template function definition.
    fn definition(&self) -> TemplateFunction;

    /// Render the template function with given arguments.
    fn render(
        &self,
        args: &std::collections::HashMap<String, serde_json::Value>,
    ) -> Result<String, String>;
}
