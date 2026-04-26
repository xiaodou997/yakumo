//! HTTP Basic Authentication.
//!
//! Encodes username:password as Base64 and adds Authorization header.

use crate::auth::AuthResult;
use crate::events::{FormInput, HttpAuthenticationConfig, HttpHeader};
use base64::Engine;
use base64::prelude::BASE64_STANDARD;
use std::collections::HashMap;

/// Get configuration for Basic Auth.
pub fn get_config() -> HttpAuthenticationConfig {
    HttpAuthenticationConfig {
        args: vec![
            FormInput {
                input_type: "text".to_string(),
                label: "Username".to_string(),
                help_url: None,
                description: Some("The username for authentication".to_string()),
                placeholder: Some("username".to_string()),
                required: Some(true),
                secret: None,
                multiline: None,
            },
            FormInput {
                input_type: "password".to_string(),
                label: "Password".to_string(),
                help_url: None,
                description: Some("The password for authentication".to_string()),
                placeholder: Some("password".to_string()),
                required: Some(true),
                secret: Some(true),
                multiline: None,
            },
        ],
        actions: None,
        source_id: None,
    }
}

/// Apply Basic Authentication.
pub fn apply_basic_auth(values: &HashMap<String, serde_json::Value>) -> AuthResult {
    let username = values.get("username").and_then(|v| v.as_str()).unwrap_or_default();
    let password = values.get("password").and_then(|v| v.as_str()).unwrap_or_default();

    let credentials = BASE64_STANDARD.encode(format!("{}:{}", username, password));
    let header_value = format!("Basic {}", credentials);

    AuthResult {
        headers: vec![HttpHeader { name: "Authorization".to_string(), value: header_value }],
        query_params: vec![],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_auth() {
        let values = HashMap::from([
            ("username".to_string(), serde_json::json!("admin")),
            ("password".to_string(), serde_json::json!("secret")),
        ]);

        let result = apply_basic_auth(&values);
        assert_eq!(result.headers.len(), 1);
        assert_eq!(result.headers[0].name, "Authorization");
        // Base64 of "admin:secret" is "YWRtaW46c2VjcmV0"
        assert_eq!(result.headers[0].value, "Basic YWRtaW46c2VjcmV0");
    }
}
