//! Authentication modules for Yakumo API.
//!
//! This module provides built-in authentication mechanisms
//! that were previously implemented as plugins.

pub mod apikey;
pub mod basic;
pub mod bearer;
pub mod jwt;
pub mod oauth2;

// TODO: Implement these modules
// pub mod oauth1;
// pub mod aws;
// pub mod ntlm;

use crate::events::{HttpAuthenticationConfig, HttpAuthenticationSummary, HttpHeader};

/// Result of applying authentication to a request.
pub struct AuthResult {
    /// Headers to add to the request
    pub headers: Vec<HttpHeader>,
    /// Query parameters to add to the request
    pub query_params: Vec<(String, String)>,
}

/// Get all available authentication type summaries.
pub fn get_authentication_summaries() -> Vec<HttpAuthenticationSummary> {
    vec![
        HttpAuthenticationSummary {
            name: "basic".to_string(),
            label: "Basic Auth".to_string(),
            description: Some("HTTP Basic Authentication with username and password".to_string()),
        },
        HttpAuthenticationSummary {
            name: "bearer".to_string(),
            label: "Bearer Token".to_string(),
            description: Some("Bearer token authentication (RFC 6750)".to_string()),
        },
        HttpAuthenticationSummary {
            name: "apikey".to_string(),
            label: "API Key".to_string(),
            description: Some("API Key authentication via header or query parameter".to_string()),
        },
        HttpAuthenticationSummary {
            name: "jwt".to_string(),
            label: "JWT".to_string(),
            description: Some(
                "JSON Web Token authentication with multiple signing algorithms".to_string(),
            ),
        },
        HttpAuthenticationSummary {
            name: "oauth2".to_string(),
            label: "OAuth 2.0".to_string(),
            description: Some("OAuth 2.0 authorization flow".to_string()),
        },
    ]
}

/// Get configuration for a specific authentication type.
pub fn get_authentication_config(auth_type: &str) -> Option<HttpAuthenticationConfig> {
    match auth_type {
        "basic" => Some(basic::get_config()),
        "bearer" => Some(bearer::get_config()),
        "apikey" => Some(apikey::get_config()),
        "jwt" => Some(jwt::get_config()),
        "oauth2" => Some(oauth2::get_config()),
        _ => None,
    }
}

/// Apply authentication based on the type name.
pub fn apply_auth(
    auth_type: &str,
    values: &std::collections::HashMap<String, serde_json::Value>,
) -> AuthResult {
    match auth_type {
        "basic" => basic::apply_basic_auth(values),
        "bearer" => bearer::apply_bearer_auth(values),
        "apikey" => apikey::apply_apikey_auth(values),
        "jwt" => jwt::apply_jwt_auth(values),
        "oauth2" => oauth2::apply_oauth2_auth(values),
        _ => AuthResult { headers: vec![], query_params: vec![] },
    }
}
