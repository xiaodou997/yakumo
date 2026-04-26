//! Import modules for Yakumo API.
//!
//! This module provides built-in import functionality
//! implemented as native Yakumo features.

use chrono::Utc;
use serde_json::{Map, Value};
use yakumo_models::models::{
    Folder, HttpRequest, HttpRequestHeader, HttpUrlParameter, WebsocketRequest,
};

pub mod curl;
pub mod insomnia;
pub mod openapi;
pub mod postman;
pub mod yakumo;

use crate::events::ImportResponse;

const CURRENT_WORKSPACE_ID: &str = "CURRENT_WORKSPACE";

/// Import data based on content detection.
pub fn import(content: &str) -> Result<Option<ImportResponse>, String> {
    if content.trim().starts_with("curl") {
        if let Some(result) = curl::import_curl(content)? {
            return Ok(Some(result));
        }
    }

    if let Some(result) = yakumo::import_yakumo(content)? {
        return Ok(Some(result));
    }

    let json = match serde_json::from_str::<Value>(content) {
        Ok(json) => json,
        Err(_) => return Ok(None),
    };

    if let Some(result) = postman::import_postman(&json)? {
        return Ok(Some(result));
    }
    if let Some(result) = insomnia::import_insomnia(&json)? {
        return Ok(Some(result));
    }
    if let Some(result) = openapi::import_openapi(&json)? {
        return Ok(Some(result));
    }

    Ok(None)
}

fn now() -> chrono::NaiveDateTime {
    Utc::now().naive_utc()
}

fn generated_id(prefix: &str, unique: impl AsRef<str>) -> String {
    format!("GENERATE_ID::{prefix}-{}", unique.as_ref())
}

fn make_folder(
    name: impl Into<String>,
    folder_id: Option<String>,
    unique: impl AsRef<str>,
) -> Folder {
    let now = now();
    Folder {
        id: generated_id("folder", unique),
        model: "folder".to_string(),
        created_at: now,
        updated_at: now,
        workspace_id: CURRENT_WORKSPACE_ID.to_string(),
        folder_id,
        authentication: Default::default(),
        authentication_type: None,
        description: String::new(),
        headers: Vec::new(),
        name: name.into(),
        sort_priority: 0.0,
    }
}

fn make_http_request(
    name: impl Into<String>,
    method: impl Into<String>,
    url: impl Into<String>,
    folder_id: Option<String>,
    unique: impl AsRef<str>,
) -> HttpRequest {
    let now = now();
    HttpRequest {
        id: generated_id("http-request", unique),
        model: "http_request".to_string(),
        created_at: now,
        updated_at: now,
        workspace_id: CURRENT_WORKSPACE_ID.to_string(),
        folder_id,
        authentication: Default::default(),
        authentication_type: None,
        body: Default::default(),
        body_type: None,
        description: String::new(),
        headers: Vec::new(),
        method: method.into(),
        name: name.into(),
        sort_priority: 0.0,
        url: url.into(),
        url_parameters: Vec::new(),
    }
}

fn make_websocket_request(
    name: impl Into<String>,
    url: impl Into<String>,
    message: impl Into<String>,
    folder_id: Option<String>,
    unique: impl AsRef<str>,
) -> WebsocketRequest {
    let now = now();
    WebsocketRequest {
        id: generated_id("websocket-request", unique),
        model: "websocket_request".to_string(),
        created_at: now,
        updated_at: now,
        workspace_id: CURRENT_WORKSPACE_ID.to_string(),
        folder_id,
        authentication: Default::default(),
        authentication_type: None,
        description: String::new(),
        headers: Vec::new(),
        message: message.into(),
        name: name.into(),
        sort_priority: 0.0,
        url: url.into(),
        url_parameters: Vec::new(),
    }
}

fn header_value_to_enabled(disabled: Option<bool>) -> bool {
    !disabled.unwrap_or(false)
}

fn parse_headers(value: Option<&Value>) -> Vec<HttpRequestHeader> {
    value
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|header| {
            let obj = header.as_object()?;
            let name = string_field(obj, &["key", "name"])?;
            let value = string_field(obj, &["value"]).unwrap_or_default();
            Some(HttpRequestHeader {
                enabled: header_value_to_enabled(bool_field(obj, &["disabled"])),
                name,
                value,
                id: None,
            })
        })
        .collect()
}

fn parse_url_parameters(url: &str) -> Vec<HttpUrlParameter> {
    let Ok(parsed) = reqwest::Url::parse(url) else {
        return Vec::new();
    };

    let mut params: Vec<HttpUrlParameter> = parsed
        .query_pairs()
        .map(|(name, value)| HttpUrlParameter {
            enabled: true,
            name: name.into_owned(),
            value: value.into_owned(),
            id: None,
        })
        .collect();

    for segment in parsed.path_segments().into_iter().flatten() {
        if let Some(name) = segment.strip_prefix(':') {
            params.push(HttpUrlParameter {
                enabled: true,
                name: format!(":{name}"),
                value: String::new(),
                id: None,
            });
        }
    }

    params
}

fn strip_query(url: &str) -> String {
    match reqwest::Url::parse(url) {
        Ok(mut parsed) => {
            parsed.set_query(None);
            parsed.to_string()
        }
        Err(_) => url.to_string(),
    }
}

fn string_field(obj: &Map<String, Value>, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        obj.get(*key).and_then(|v| match v {
            Value::String(s) => Some(s.clone()),
            Value::Number(n) => Some(n.to_string()),
            Value::Bool(v) => Some(v.to_string()),
            _ => None,
        })
    })
}

fn bool_field(obj: &Map<String, Value>, keys: &[&str]) -> Option<bool> {
    keys.iter().find_map(|key| obj.get(*key).and_then(Value::as_bool))
}

fn infer_body_type(raw: &str, content_type: Option<&str>) -> Option<String> {
    if let Some(content_type) = content_type {
        let lower = content_type.to_ascii_lowercase();
        if lower.contains("application/json") {
            return Some("application/json".to_string());
        }
        if lower.contains("graphql") {
            return Some("graphql".to_string());
        }
        if lower.contains("xml") {
            return Some("text/xml".to_string());
        }
        if lower.contains("application/x-www-form-urlencoded") {
            return Some("application/x-www-form-urlencoded".to_string());
        }
        if lower.contains("multipart/form-data") {
            return Some("multipart/form-data".to_string());
        }
    }

    let trimmed = raw.trim();
    if trimmed.starts_with('{') || trimmed.starts_with('[') {
        Some("application/json".to_string())
    } else if trimmed.starts_with('<') {
        Some("text/xml".to_string())
    } else {
        Some("other".to_string())
    }
}
