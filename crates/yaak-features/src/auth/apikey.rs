//! API Key Authentication.
//!
//! Adds a custom header or query parameter with the API key.

use crate::auth::AuthResult;
use crate::events::{FormInput, HttpAuthenticationConfig, HttpHeader};
use std::collections::HashMap;

/// Get configuration for API Key.
pub fn get_config() -> HttpAuthenticationConfig {
    HttpAuthenticationConfig {
        args: vec![
            FormInput {
                input_type: "select".to_string(),
                label: "Location".to_string(),
                help_url: None,
                description: Some("Where to add the API key".to_string()),
                placeholder: None,
                required: Some(true),
                secret: None,
                multiline: None,
            },
            FormInput {
                input_type: "text".to_string(),
                label: "Key Name".to_string(),
                help_url: None,
                description: Some("Name of the header or query parameter".to_string()),
                placeholder: Some("X-API-Key".to_string()),
                required: Some(true),
                secret: None,
                multiline: None,
            },
            FormInput {
                input_type: "password".to_string(),
                label: "API Key Value".to_string(),
                help_url: None,
                description: Some("The API key value".to_string()),
                placeholder: Some("Enter your API key".to_string()),
                required: Some(true),
                secret: Some(true),
                multiline: None,
            },
        ],
        actions: None,
        plugin_ref_id: None,
    }
}

/// Apply API Key Authentication.
///
/// location: "header" or "query"
/// key: name of the header or query parameter
/// value: the API key value
pub fn apply_apikey_auth(values: &HashMap<String, serde_json::Value>) -> AuthResult {
    let location = values.get("location").and_then(|v| v.as_str()).unwrap_or("header");
    let key = values.get("key").and_then(|v| v.as_str()).unwrap_or("X-API-Key");
    let value = values.get("value").and_then(|v| v.as_str()).unwrap_or_default();

    if location == "query" {
        AuthResult { headers: vec![], query_params: vec![(key.to_string(), value.to_string())] }
    } else {
        AuthResult {
            headers: vec![HttpHeader { name: key.to_string(), value: value.to_string() }],
            query_params: vec![],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_apikey_header() {
        let values = HashMap::from([
            ("location".to_string(), serde_json::json!("header")),
            ("key".to_string(), serde_json::json!("X-API-Key")),
            ("value".to_string(), serde_json::json!("my-api-key")),
        ]);

        let result = apply_apikey_auth(&values);
        assert_eq!(result.headers.len(), 1);
        assert_eq!(result.headers[0].name, "X-API-Key");
        assert_eq!(result.headers[0].value, "my-api-key");
        assert_eq!(result.query_params.len(), 0);
    }

    #[test]
    fn test_apikey_query() {
        let values = HashMap::from([
            ("location".to_string(), serde_json::json!("query")),
            ("key".to_string(), serde_json::json!("api_key")),
            ("value".to_string(), serde_json::json!("my-api-key")),
        ]);

        let result = apply_apikey_auth(&values);
        assert_eq!(result.headers.len(), 0);
        assert_eq!(result.query_params.len(), 1);
        assert_eq!(result.query_params[0], ("api_key".to_string(), "my-api-key".to_string()));
    }

    #[test]
    fn test_apikey_defaults() {
        let values = HashMap::new();

        let result = apply_apikey_auth(&values);
        assert_eq!(result.headers.len(), 1);
        assert_eq!(result.headers[0].name, "X-API-Key");
        assert_eq!(result.headers[0].value, "");
    }
}
