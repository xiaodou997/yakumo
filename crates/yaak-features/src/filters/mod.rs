//! Filter modules for Yakumo API.
//!
//! This module provides built-in filter functionality
//! that were previously implemented as plugins.

// TODO: Implement these modules
// pub mod jsonpath;
// pub mod xpath;

/// Filter trait for all filter implementations.
pub trait Filter {
    /// Get the unique name of this filter.
    fn name(&self) -> &str;

    /// Apply the filter to content.
    fn apply(&self, content: &str, expression: &str) -> Result<String, String>;
}
