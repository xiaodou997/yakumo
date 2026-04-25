//! Copy as curl Action.
//!
//! Converts an HTTP request to a curl command.

use yaak_models::models::{HttpRequest, HttpUrlParameter};

/// Convert an HTTP request to a curl command.
pub fn request_to_curl(request: &HttpRequest) -> String {
    let mut parts: Vec<String> = vec!["curl".to_string()];

    // Method
    if request.method != "GET" {
        parts.push(format!("-X {}", request.method));
    }

    // URL with query parameters
    let url = build_url_with_params(&request.url, &request.url_parameters);
    parts.push(format!("'{}'", url));

    // Headers
    for header in &request.headers {
        if header.enabled {
            parts.push(format!(
                "-H '{}: {}'",
                escape_for_shell(&header.name),
                escape_for_shell(&header.value)
            ));
        }
    }

    // Body
    if let Some(body_type) = &request.body_type {
        let body = get_body_content(request);
        if !body.is_empty() {
            match body_type.as_str() {
                "application/json" | "text/plain" | "text/xml" | "text/html" => {
                    parts.push(format!("-d '{}'", escape_for_shell(&body)));
                }
                "application/x-www-form-urlencoded" => {
                    parts.push(format!("--data-raw '{}'", escape_for_shell(&body)));
                }
                _ => {
                    parts.push(format!("-d '{}'", escape_for_shell(&body)));
                }
            }
        }
    }

    parts.join(" ")
}

/// Build URL with query parameters.
fn build_url_with_params(base_url: &str, params: &[HttpUrlParameter]) -> String {
    if params.is_empty() {
        return base_url.to_string();
    }

    let enabled_params: Vec<&HttpUrlParameter> = params.iter().filter(|p| p.enabled).collect();
    if enabled_params.is_empty() {
        return base_url.to_string();
    }

    let query_parts: Vec<String> = enabled_params
        .iter()
        .map(|p| format!("{}={}", urlencoding::encode(&p.name), urlencoding::encode(&p.value)))
        .collect();
    let query_string = query_parts.join("&");

    if base_url.contains('?') {
        format!("{}&{}", base_url, query_string)
    } else {
        format!("{}?{}", base_url, query_string)
    }
}

/// Get body content from request.
fn get_body_content(request: &HttpRequest) -> String {
    if let Some(text) = request.body.get("text").and_then(|v| v.as_str()) {
        return text.to_string();
    }

    // Handle form data
    if let Some(form) = request.body.get("form").and_then(|v| v.as_array()) {
        let form_parts: Vec<String> = form
            .iter()
            .filter_map(|item| {
                let name = item.get("name").and_then(|v| v.as_str())?;
                let value = item.get("value").and_then(|v| v.as_str()).unwrap_or_default();
                Some(format!("{}={}", urlencoding::encode(name), urlencoding::encode(value)))
            })
            .collect();
        return form_parts.join("&");
    }

    String::new()
}

/// Escape a string for shell usage (single quotes).
fn escape_for_shell(s: &str) -> String {
    // Replace single quotes with '\'' (end quote, escaped quote, start quote)
    s.replace("'", "'\\''")
}

#[cfg(test)]
mod tests {
    use super::*;
    use yaak_models::models::HttpRequestHeader;

    fn create_test_request() -> HttpRequest {
        HttpRequest {
            id: "test".to_string(),
            model: "http_request".to_string(),
            created_at: chrono::Utc::now().naive_utc(),
            updated_at: chrono::Utc::now().naive_utc(),
            workspace_id: "ws".to_string(),
            folder_id: None,
            authentication: Default::default(),
            authentication_type: None,
            body: Default::default(),
            body_type: None,
            description: "".to_string(),
            headers: vec![HttpRequestHeader {
                id: None,
                name: "Content-Type".to_string(),
                value: "application/json".to_string(),
                enabled: true,
            }],
            method: "POST".to_string(),
            name: "Test Request".to_string(),
            sort_priority: 0.0,
            url: "https://api.example.com/users".to_string(),
            url_parameters: vec![],
        }
    }

    #[test]
    fn test_simple_get_request() {
        let request = HttpRequest {
            method: "GET".to_string(),
            url: "https://api.example.com/users".to_string(),
            headers: vec![],
            url_parameters: vec![],
            ..create_test_request()
        };

        let curl = request_to_curl(&request);
        assert_eq!(curl, "curl 'https://api.example.com/users'");
    }

    #[test]
    fn test_post_request_with_body() {
        let request = HttpRequest {
            method: "POST".to_string(),
            body_type: Some("application/json".to_string()),
            body: serde_json::from_str("{\"text\": \"{\\\"name\\\": \\\"test\\\"}\"}").unwrap(),
            ..create_test_request()
        };

        let curl = request_to_curl(&request);
        assert!(curl.contains("-X POST"));
        assert!(curl.contains("-H 'Content-Type: application/json'"));
    }

    #[test]
    fn test_request_with_query_params() {
        let request = HttpRequest {
            url: "https://api.example.com/users".to_string(),
            url_parameters: vec![
                HttpUrlParameter {
                    id: None,
                    name: "page".to_string(),
                    value: "1".to_string(),
                    enabled: true,
                },
                HttpUrlParameter {
                    id: None,
                    name: "limit".to_string(),
                    value: "10".to_string(),
                    enabled: true,
                },
            ],
            ..create_test_request()
        };

        let curl = request_to_curl(&request);
        assert!(curl.contains("?page=1&limit=10"));
    }

    #[test]
    fn test_escape_single_quotes() {
        assert_eq!(escape_for_shell("hello"), "hello");
        assert_eq!(escape_for_shell("it's"), "it'\\''s");
    }
}
