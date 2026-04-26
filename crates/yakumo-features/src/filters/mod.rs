//! Filter modules for Yakumo API.
//!
//! This module provides built-in filter functionality
//! implemented as native Yakumo features.

pub mod jsonpath;
pub mod xpath;

/// Filter trait for all filter implementations.
pub trait Filter {
    /// Get the unique name of this filter.
    fn name(&self) -> &str;

    /// Apply the filter to content.
    fn apply(&self, content: &str, expression: &str) -> Result<String, String>;
}

pub fn apply_jsonpath(content: &str, expression: &str) -> Result<String, String> {
    jsonpath::JsonPathFilter.apply(content, expression)
}

pub fn apply_xpath(content: &str, expression: &str) -> Result<String, String> {
    xpath::XPathFilter.apply(content, expression)
}
