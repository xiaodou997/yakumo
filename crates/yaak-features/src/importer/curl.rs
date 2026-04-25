//! Curl command import.
//!
//! Parses curl commands and converts them to HTTP requests.

use crate::events::{ImportResources, ImportResponse};
use chrono::Utc;
use regex::Regex;
use yaak_models::models::{HttpRequest, HttpRequestHeader};

/// Import from curl command.
pub fn import_curl(content: &str) -> Result<Option<ImportResponse>, String> {
    // Parse curl command
    let request = parse_curl_command(content)?;

    if request.is_none() {
        return Ok(None);
    }

    let req = request.unwrap();

    Ok(Some(ImportResponse {
        resources: Some(ImportResources {
            workspace: None,
            environment: None,
            folders: vec![],
            http_requests: vec![req],
            grpc_requests: vec![],
            websocket_requests: vec![],
        }),
        error: None,
    }))
}

/// Parse a curl command into an HTTP request.
fn parse_curl_command(content: &str) -> Result<Option<HttpRequest>, String> {
    // Clean up the content
    let content = content.trim();

    // Check if it starts with curl
    if !content.starts_with("curl") {
        return Ok(None);
    }

    // Initialize request with defaults
    let now = Utc::now().naive_utc();
    let mut request = HttpRequest {
        id: generate_request_id(),
        model: "http_request".to_string(),
        created_at: now,
        updated_at: now,
        workspace_id: "".to_string(), // Will be set by importer
        folder_id: None,
        authentication: Default::default(),
        authentication_type: None,
        body: Default::default(),
        body_type: None,
        description: "".to_string(),
        headers: vec![],
        method: "GET".to_string(),
        name: "Imported from curl".to_string(),
        sort_priority: 0.0,
        url: "".to_string(),
        url_parameters: vec![],
    };

    // Parse URL
    let _url_match = Regex::new(r#"(?:--url|-u)?['"]?([^'"]+)['"]?"#)
        .map_err(|e| format!("Regex error: {}", e))?;

    // Find URL - look for the main URL argument
    // Split by whitespace and find URL-like argument
    let parts = split_curl_args(content);

    let mut i = 0;
    while i < parts.len() {
        let part = &parts[i];

        if part == "-X" || part == "--request" {
            // Method
            if i + 1 < parts.len() {
                request.method = parts[i + 1].to_string();
                i += 2;
                continue;
            }
        }

        if part == "-H" || part == "--header" {
            // Header
            if i + 1 < parts.len() {
                let header_str = &parts[i + 1];
                if let Some(header) = parse_header(header_str) {
                    request.headers.push(header);
                }
                i += 2;
                continue;
            }
        }

        if part == "-d" || part == "--data" || part == "--data-raw" || part == "--data-binary" {
            // Body data
            if i + 1 < parts.len() {
                let data = &parts[i + 1];
                request.body.insert("text".to_string(), serde_json::json!(data));
                request.body_type = Some("text/plain".to_string());

                // Set method to POST if not already set
                if request.method == "GET" {
                    request.method = "POST".to_string();
                }
                i += 2;
                continue;
            }
        }

        if part == "--json" {
            // JSON body
            if i + 1 < parts.len() {
                let data = &parts[i + 1];
                request.body.insert("text".to_string(), serde_json::json!(data));
                request.body_type = Some("application/json".to_string());
                request.method = "POST".to_string();
                i += 2;
                continue;
            }
        }

        // Check if this looks like a URL
        if part.starts_with("http://") || part.starts_with("https://") {
            request.url = part.to_string();
        }

        i += 1;
    }

    // If no URL found, return None
    if request.url.is_empty() {
        return Ok(None);
    }

    // Extract name from URL
    request.name = extract_name_from_url(&request.url);

    Ok(Some(request))
}

/// Split curl command into arguments.
fn split_curl_args(content: &str) -> Vec<String> {
    let mut args: Vec<String> = vec![];
    let mut current = String::new();
    let mut in_quotes = false;
    let mut quote_char = ' ';

    for c in content.chars() {
        if in_quotes {
            if c == quote_char {
                in_quotes = false;
                args.push(current.trim().to_string());
                current = String::new();
            } else {
                current.push(c);
            }
        } else {
            if c == '\'' || c == '"' {
                if !current.trim().is_empty() {
                    args.push(current.trim().to_string());
                    current = String::new();
                }
                in_quotes = true;
                quote_char = c;
            } else if c == ' ' || c == '\t' || c == '\n' {
                if !current.trim().is_empty() {
                    args.push(current.trim().to_string());
                    current = String::new();
                }
            } else {
                current.push(c);
            }
        }
    }

    if !current.trim().is_empty() {
        args.push(current.trim().to_string());
    }

    args
}

/// Parse a header string (e.g., "Content-Type: application/json").
fn parse_header(header_str: &str) -> Option<HttpRequestHeader> {
    let parts: Vec<&str> = header_str.splitn(2, ':').collect();
    if parts.len() == 2 {
        Some(HttpRequestHeader {
            id: None,
            name: parts[0].trim().to_string(),
            value: parts[1].trim().to_string(),
            enabled: true,
        })
    } else {
        None
    }
}

/// Generate a request ID.
fn generate_request_id() -> String {
    format!("rq_{}", uuid::Uuid::new_v4().simple())
}

/// Extract a name from URL.
fn extract_name_from_url(url: &str) -> String {
    // Remove protocol
    let url = url.replace("https://", "").replace("http://", "");

    // Get path part
    let parts: Vec<&str> = url.splitn(2, '/').collect();
    if parts.len() > 1 { parts[1].to_string() } else { url.to_string() }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_import_simple_curl() {
        let curl = "curl https://api.example.com/users";
        let result = import_curl(curl).unwrap();
        assert!(result.is_some());
        let response = result.unwrap();
        let resources = response.resources.unwrap();
        assert_eq!(resources.http_requests.len(), 1);
        assert_eq!(resources.http_requests[0].method, "GET");
        assert_eq!(resources.http_requests[0].url, "https://api.example.com/users");
    }

    #[test]
    fn test_import_curl_with_method() {
        let curl = "curl -X POST https://api.example.com/users";
        let result = import_curl(curl).unwrap();
        assert!(result.is_some());
        let response = result.unwrap();
        let resources = response.resources.unwrap();
        assert_eq!(resources.http_requests[0].method, "POST");
    }

    #[test]
    fn test_import_curl_with_headers() {
        let curl = "curl -H 'Content-Type: application/json' https://api.example.com/users";
        let result = import_curl(curl).unwrap();
        assert!(result.is_some());
        let response = result.unwrap();
        let resources = response.resources.unwrap();
        assert_eq!(resources.http_requests[0].headers.len(), 1);
        assert_eq!(resources.http_requests[0].headers[0].name, "Content-Type");
    }

    #[test]
    fn test_import_curl_with_data() {
        let curl = "curl -d '{\"name\": \"test\"}' https://api.example.com/users";
        let result = import_curl(curl).unwrap();
        assert!(result.is_some());
        let response = result.unwrap();
        let resources = response.resources.unwrap();
        assert_eq!(resources.http_requests[0].method, "POST");
        assert!(resources.http_requests[0].body.contains_key("text"));
    }

    #[test]
    fn test_import_non_curl() {
        let content = "not a curl command";
        let result = import_curl(content).unwrap();
        assert!(result.is_none());
    }
}
