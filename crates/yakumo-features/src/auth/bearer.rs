//! Bearer Token Authentication.
//!
//! Adds Authorization: Bearer <token> header.

use crate::auth::AuthResult;
use crate::events::{FormInput, HttpAuthenticationConfig, HttpHeader};
use std::collections::HashMap;

/// Get configuration for Bearer Token.
pub fn get_config() -> HttpAuthenticationConfig {
    HttpAuthenticationConfig {
        args: vec![FormInput {
            input_type: "password".to_string(),
            label: "Token".to_string(),
            help_url: None,
            description: Some("The bearer token for authorization".to_string()),
            placeholder: Some("Enter your token".to_string()),
            required: Some(true),
            secret: Some(true),
            multiline: None,
        }],
        actions: None,
        source_id: None,
    }
}

/// Apply Bearer Token Authentication.
pub fn apply_bearer_auth(values: &HashMap<String, serde_json::Value>) -> AuthResult {
    let token = values.get("token").and_then(|v| v.as_str()).unwrap_or_default();

    let header_value = format!("Bearer {}", token);

    AuthResult {
        headers: vec![HttpHeader { name: "Authorization".to_string(), value: header_value }],
        query_params: vec![],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bearer_auth() {
        let values = HashMap::from([("token".to_string(), serde_json::json!("my-secret-token"))]);

        let result = apply_bearer_auth(&values);
        assert_eq!(result.headers.len(), 1);
        assert_eq!(result.headers[0].value, "Bearer my-secret-token");
    }
}
