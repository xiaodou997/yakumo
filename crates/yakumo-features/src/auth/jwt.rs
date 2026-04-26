//! JWT Bearer Authentication.
//!
//! Generates and signs JWT tokens for authentication.

use crate::auth::AuthResult;
use crate::events::{FormInput, HttpAuthenticationConfig, HttpHeader};
use jsonwebtoken::{Algorithm, EncodingKey, Header, encode};
use std::collections::HashMap;

/// Get configuration for JWT.
pub fn get_config() -> HttpAuthenticationConfig {
    HttpAuthenticationConfig {
        args: vec![
            FormInput {
                input_type: "select".to_string(),
                label: "Algorithm".to_string(),
                help_url: None,
                description: Some("JWT signing algorithm (HS256, RS256, etc.)".to_string()),
                placeholder: Some("HS256".to_string()),
                required: Some(true),
                secret: None,
                multiline: None,
            },
            FormInput {
                input_type: "password".to_string(),
                label: "Secret / Private Key".to_string(),
                help_url: None,
                description: Some("Secret key for HMAC or private key for RSA/ECDSA".to_string()),
                placeholder: Some("Enter secret".to_string()),
                required: Some(true),
                secret: Some(true),
                multiline: Some(true),
            },
            FormInput {
                input_type: "checkbox".to_string(),
                label: "Secret is Base64".to_string(),
                help_url: None,
                description: Some("Decode secret from Base64 before use".to_string()),
                placeholder: None,
                required: None,
                secret: None,
                multiline: None,
            },
            FormInput {
                input_type: "textarea".to_string(),
                label: "Payload (JSON)".to_string(),
                help_url: None,
                description: Some("JWT claims payload as JSON".to_string()),
                placeholder: Some("{\"sub\": \"user\", \"aud\": \"api\"}".to_string()),
                required: Some(true),
                secret: None,
                multiline: Some(true),
            },
        ],
        actions: None,
        source_id: None,
    }
}

/// JWT configuration.
pub struct JwtConfig {
    /// Algorithm (HS256, HS384, HS512, RS256, etc.)
    pub algorithm: Algorithm,
    /// Secret or private key
    pub secret: String,
    /// Whether the secret is base64 encoded
    pub secret_base64: bool,
    /// JWT payload (JSON)
    pub payload: String,
    /// Extra header fields (JSON)
    pub extra_headers: Option<String>,
    /// Where to put the token ("header" or "query")
    pub location: String,
    /// Header name (default: "Authorization")
    pub header_name: String,
    /// Header prefix (default: "Bearer")
    pub header_prefix: Option<String>,
    /// Query parameter name (default: "token")
    pub query_name: String,
}

/// Apply JWT Authentication.
pub fn apply_jwt_auth(values: &HashMap<String, serde_json::Value>) -> AuthResult {
    let algorithm = values.get("algorithm").and_then(|v| v.as_str()).unwrap_or("HS256");

    let secret = values.get("secret").and_then(|v| v.as_str()).unwrap_or_default();

    let secret_base64 = values.get("secretBase64").and_then(|v| v.as_bool()).unwrap_or(false);

    let payload = values.get("payload").and_then(|v| v.as_str()).unwrap_or("{}");

    let extra_headers = values.get("headers").and_then(|v| v.as_str());

    let location = values.get("location").and_then(|v| v.as_str()).unwrap_or("header");

    let header_name = values.get("name").and_then(|v| v.as_str()).unwrap_or("Authorization");

    let header_prefix = values.get("headerPrefix").and_then(|v| v.as_str());

    let query_name = values.get("queryName").and_then(|v| v.as_str()).unwrap_or("token");

    // Parse algorithm
    let algo = parse_algorithm(algorithm);

    // Generate token
    let token =
        generate_jwt(algo, secret, secret_base64, payload, extra_headers).unwrap_or_default();

    if location == "query" {
        AuthResult { headers: vec![], query_params: vec![(query_name.to_string(), token)] }
    } else {
        let header_value = if let Some(prefix) = header_prefix {
            format!("{} {}", prefix, token)
        } else {
            format!("Bearer {}", token)
        };

        AuthResult {
            headers: vec![HttpHeader {
                name: header_name.to_string(),
                value: header_value.trim().to_string(),
            }],
            query_params: vec![],
        }
    }
}

/// Parse algorithm string to Algorithm enum.
fn parse_algorithm(algo: &str) -> Algorithm {
    match algo {
        "HS256" => Algorithm::HS256,
        "HS384" => Algorithm::HS384,
        "HS512" => Algorithm::HS512,
        "RS256" => Algorithm::RS256,
        "RS384" => Algorithm::RS384,
        "RS512" => Algorithm::RS512,
        "PS256" => Algorithm::PS256,
        "PS384" => Algorithm::PS384,
        "PS512" => Algorithm::PS512,
        "ES256" => Algorithm::ES256,
        "ES384" => Algorithm::ES384,
        "EdDSA" => Algorithm::EdDSA,
        _ => Algorithm::HS256,
    }
}

/// Generate JWT token.
fn generate_jwt(
    algorithm: Algorithm,
    secret: &str,
    secret_base64: bool,
    payload: &str,
    extra_headers: Option<&str>,
) -> Result<String, String> {
    // Create header
    let mut header = Header::new(algorithm);

    // Parse extra headers if provided
    if let Some(extra) = extra_headers {
        if !extra.is_empty() && extra != "{}" {
            let extra_map: HashMap<String, serde_json::Value> = serde_json::from_str(extra)
                .map_err(|e| format!("Invalid extra headers JSON: {}", e))?;

            // Add kid if provided
            if let Some(kid) = extra_map.get("kid").and_then(|v| v.as_str()) {
                header.kid = Some(kid.to_string());
            }
        }
    }

    // Parse payload
    let claims: serde_json::Value =
        serde_json::from_str(payload).map_err(|e| format!("Invalid payload JSON: {}", e))?;

    // Create encoding key
    let key = if secret_base64 {
        let decoded = base64::Engine::decode(&base64::prelude::BASE64_STANDARD, secret)
            .map_err(|e| format!("Invalid base64 secret: {}", e))?;
        EncodingKey::from_secret(&decoded)
    } else {
        EncodingKey::from_secret(secret.as_bytes())
    };

    // Encode token
    encode(&header, &claims, &key).map_err(|e| format!("Failed to encode JWT: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jwt_hs256() {
        let values = HashMap::from([
            ("algorithm".to_string(), serde_json::json!("HS256")),
            ("secret".to_string(), serde_json::json!("my-secret")),
            ("payload".to_string(), serde_json::json!("{\"sub\": \"test\"}")),
        ]);

        let result = apply_jwt_auth(&values);
        assert_eq!(result.headers.len(), 1);
        assert!(result.headers[0].value.starts_with("Bearer "));

        // Token should be valid JWT format (three parts separated by dots)
        let token = result.headers[0].value.replace("Bearer ", "");
        let parts: Vec<&str> = token.split('.').collect();
        assert_eq!(parts.len(), 3);
    }

    #[test]
    fn test_jwt_query_location() {
        let values = HashMap::from([
            ("algorithm".to_string(), serde_json::json!("HS256")),
            ("secret".to_string(), serde_json::json!("secret")),
            ("payload".to_string(), serde_json::json!("{}")),
            ("location".to_string(), serde_json::json!("query")),
        ]);

        let result = apply_jwt_auth(&values);
        assert_eq!(result.headers.len(), 0);
        assert_eq!(result.query_params.len(), 1);
        assert_eq!(result.query_params[0].0, "token");
    }

    #[test]
    fn test_jwt_base64_secret() {
        let values = HashMap::from([
            ("algorithm".to_string(), serde_json::json!("HS256")),
            ("secret".to_string(), serde_json::json!("bXktc2VjcmV0")), // base64 of "my-secret"
            ("secretBase64".to_string(), serde_json::json!(true)),
            ("payload".to_string(), serde_json::json!("{}")),
        ]);

        let result = apply_jwt_auth(&values);
        assert_eq!(result.headers.len(), 1);
    }
}
