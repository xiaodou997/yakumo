//! OAuth 2.0 Authentication.
//!
//! Implements OAuth 2.0 flows for API authentication.

use crate::auth::AuthResult;
use crate::events::{FormInput, HttpAuthenticationConfig, HttpHeader};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Get configuration for OAuth 2.0.
pub fn get_config() -> HttpAuthenticationConfig {
    HttpAuthenticationConfig {
        args: vec![
            FormInput {
                input_type: "password".to_string(),
                label: "Access Token".to_string(),
                help_url: None,
                description: Some("OAuth 2.0 access token".to_string()),
                placeholder: Some("Enter access token".to_string()),
                required: Some(true),
                secret: Some(true),
                multiline: None,
            },
            FormInput {
                input_type: "text".to_string(),
                label: "Header Name".to_string(),
                help_url: None,
                description: Some("Header name for token (default: Authorization)".to_string()),
                placeholder: Some("Authorization".to_string()),
                required: None,
                secret: None,
                multiline: None,
            },
            FormInput {
                input_type: "text".to_string(),
                label: "Token Prefix".to_string(),
                help_url: None,
                description: Some("Token prefix (default: Bearer)".to_string()),
                placeholder: Some("Bearer".to_string()),
                required: None,
                secret: None,
                multiline: None,
            },
        ],
        actions: None,
        plugin_ref_id: None,
    }
}

/// OAuth 2.0 Token response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuth2Token {
    pub access_token: String,
    #[serde(default)]
    pub token_type: String,
    #[serde(default)]
    pub expires_in: Option<i64>,
    #[serde(default)]
    pub refresh_token: Option<String>,
    #[serde(default)]
    pub scope: Option<String>,
}

/// OAuth 2.0 Authorization Code flow configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuth2AuthCodeConfig {
    /// Authorization endpoint URL
    pub authorization_url: String,
    /// Token endpoint URL  
    pub token_url: String,
    /// Client ID
    pub client_id: String,
    /// Client Secret
    pub client_secret: String,
    /// Redirect URI
    pub redirect_uri: String,
    /// Scopes (space-separated)
    pub scope: String,
    /// State parameter
    pub state: Option<String>,
    /// PKCE code challenge method (plain or S256)
    pub code_challenge_method: Option<String>,
}

/// OAuth 2.0 Client Credentials flow configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuth2ClientCredentialsConfig {
    /// Token endpoint URL
    pub token_url: String,
    /// Client ID
    pub client_id: String,
    /// Client Secret
    pub client_secret: String,
    /// Scopes (space-separated)
    pub scope: Option<String>,
}

/// Apply OAuth 2.0 authentication with existing token.
pub fn apply_oauth2_auth(values: &HashMap<String, serde_json::Value>) -> AuthResult {
    let access_token = values.get("accessToken").and_then(|v| v.as_str()).unwrap_or_default();

    let header_name = values.get("name").and_then(|v| v.as_str()).unwrap_or("Authorization");

    let header_prefix = values.get("headerPrefix").and_then(|v| v.as_str()).unwrap_or("Bearer");

    let location = values.get("location").and_then(|v| v.as_str()).unwrap_or("header");

    let query_name = values.get("queryName").and_then(|v| v.as_str()).unwrap_or("token");

    if location == "query" {
        AuthResult {
            headers: vec![],
            query_params: vec![(query_name.to_string(), access_token.to_string())],
        }
    } else {
        let header_value = if header_prefix.is_empty() {
            access_token.to_string()
        } else {
            format!("{} {}", header_prefix, access_token)
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

/// Generate authorization URL for Authorization Code flow.
pub fn generate_authorization_url(config: &OAuth2AuthCodeConfig) -> String {
    let mut params: Vec<String> = vec![
        format!("response_type=code"),
        format!("client_id={}", urlencoding::encode(&config.client_id)),
        format!("redirect_uri={}", urlencoding::encode(&config.redirect_uri)),
    ];

    if !config.scope.is_empty() {
        params.push(format!("scope={}", urlencoding::encode(&config.scope)));
    }

    if let Some(state) = &config.state {
        params.push(format!("state={}", urlencoding::encode(state)));
    }

    if let Some(method) = &config.code_challenge_method {
        // PKCE support - need to generate code_verifier and code_challenge
        // For simplicity, we'll just add the parameter placeholder
        params.push(format!("code_challenge_method={}", urlencoding::encode(method)));
    }

    format!("{}?{}", config.authorization_url, params.join("&"))
}

/// Exchange authorization code for token.
pub async fn exchange_code_for_token(
    config: &OAuth2AuthCodeConfig,
    code: &str,
    code_verifier: Option<&str>,
) -> Result<OAuth2Token, String> {
    let mut body: Vec<(String, String)> = vec![
        ("grant_type".to_string(), "authorization_code".to_string()),
        ("code".to_string(), code.to_string()),
        ("redirect_uri".to_string(), config.redirect_uri.clone()),
        ("client_id".to_string(), config.client_id.clone()),
        ("client_secret".to_string(), config.client_secret.clone()),
    ];

    if let Some(verifier) = code_verifier {
        body.push(("code_verifier".to_string(), verifier.to_string()));
    }

    let body_string = body
        .iter()
        .map(|(k, v)| format!("{}={}", urlencoding::encode(k), urlencoding::encode(v)))
        .collect::<Vec<_>>()
        .join("&");

    let client = reqwest::Client::new();
    let response = client
        .post(&config.token_url)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .header("Accept", "application/json")
        .body(body_string)
        .send()
        .await
        .map_err(|e| format!("Failed to send token request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Token request failed: {} - {}", status, body));
    }

    response
        .json::<OAuth2Token>()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))
}

/// Get token using Client Credentials flow.
pub async fn get_client_credentials_token(
    config: &OAuth2ClientCredentialsConfig,
) -> Result<OAuth2Token, String> {
    let mut body: Vec<(String, String)> = vec![
        ("grant_type".to_string(), "client_credentials".to_string()),
        ("client_id".to_string(), config.client_id.clone()),
        ("client_secret".to_string(), config.client_secret.clone()),
    ];

    if let Some(scope) = &config.scope {
        body.push(("scope".to_string(), scope.clone()));
    }

    let body_string = body
        .iter()
        .map(|(k, v)| format!("{}={}", urlencoding::encode(k), urlencoding::encode(v)))
        .collect::<Vec<_>>()
        .join("&");

    let client = reqwest::Client::new();
    let response = client
        .post(&config.token_url)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .header("Accept", "application/json")
        .body(body_string)
        .send()
        .await
        .map_err(|e| format!("Failed to send token request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Token request failed: {} - {}", status, body));
    }

    response
        .json::<OAuth2Token>()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))
}

/// Refresh OAuth 2.0 token.
pub async fn refresh_token(
    token_url: &str,
    client_id: &str,
    client_secret: &str,
    refresh_token: &str,
) -> Result<OAuth2Token, String> {
    let body: Vec<(String, String)> = vec![
        ("grant_type".to_string(), "refresh_token".to_string()),
        ("refresh_token".to_string(), refresh_token.to_string()),
        ("client_id".to_string(), client_id.to_string()),
        ("client_secret".to_string(), client_secret.to_string()),
    ];

    let body_string = body
        .iter()
        .map(|(k, v)| format!("{}={}", urlencoding::encode(k), urlencoding::encode(v)))
        .collect::<Vec<_>>()
        .join("&");

    let client = reqwest::Client::new();
    let response = client
        .post(token_url)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .header("Accept", "application/json")
        .body(body_string)
        .send()
        .await
        .map_err(|e| format!("Failed to send refresh request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Refresh request failed: {} - {}", status, body));
    }

    response
        .json::<OAuth2Token>()
        .await
        .map_err(|e| format!("Failed to parse refresh response: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_apply_oauth2_auth_header() {
        let values =
            HashMap::from([("accessToken".to_string(), serde_json::json!("my-access-token"))]);

        let result = apply_oauth2_auth(&values);
        assert_eq!(result.headers.len(), 1);
        assert_eq!(result.headers[0].name, "Authorization");
        assert_eq!(result.headers[0].value, "Bearer my-access-token");
    }

    #[test]
    fn test_apply_oauth2_auth_query() {
        let values = HashMap::from([
            ("accessToken".to_string(), serde_json::json!("my-access-token")),
            ("location".to_string(), serde_json::json!("query")),
        ]);

        let result = apply_oauth2_auth(&values);
        assert_eq!(result.headers.len(), 0);
        assert_eq!(result.query_params.len(), 1);
        assert_eq!(result.query_params[0], ("token".to_string(), "my-access-token".to_string()));
    }

    #[test]
    fn test_generate_authorization_url() {
        let config = OAuth2AuthCodeConfig {
            authorization_url: "https://auth.example.com/oauth/authorize".to_string(),
            token_url: "https://auth.example.com/oauth/token".to_string(),
            client_id: "my-client".to_string(),
            client_secret: "my-secret".to_string(),
            redirect_uri: "https://app.example.com/callback".to_string(),
            scope: "read write".to_string(),
            state: Some("random-state".to_string()),
            code_challenge_method: None,
        };

        let url = generate_authorization_url(&config);

        assert!(url.contains("response_type=code"));
        assert!(url.contains("client_id=my-client"));
        assert!(url.contains("redirect_uri=https"));
        assert!(url.contains("scope=read%20write"));
        assert!(url.contains("state=random-state"));
    }
}
