//! Built-in features for Yakumo API.
//!
//! This crate provides authentication, template functions, importers,
//! actions, and other functionality as native Rust implementations.
//!
//! All features are implemented in Rust for better performance and
//! smaller bundle size. No external plugin runtime is needed.

pub mod error;
pub mod events;

// Built-in feature modules
pub mod actions;
pub mod auth;
pub mod filters;
pub mod importer;
pub mod template;
pub mod themes;
