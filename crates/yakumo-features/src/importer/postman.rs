use crate::events::{ImportResources, ImportResponse};
use crate::importer::{
    infer_body_type, make_folder, make_http_request, make_websocket_request, parse_headers,
    parse_url_parameters, string_field, strip_query,
};
use serde_json::{Map, Value};
use yakumo_models::models::{Folder, HttpRequest, WebsocketRequest};

pub fn import_postman(json: &Value) -> Result<Option<ImportResponse>, String> {
    let Some(obj) = json.as_object() else {
        return Ok(None);
    };

    let schema = obj
        .get("info")
        .and_then(Value::as_object)
        .and_then(|info| string_field(info, &["schema"]))
        .unwrap_or_default()
        .to_ascii_lowercase();
    if !schema.contains("postman") {
        return Ok(None);
    }

    let mut folders = Vec::new();
    let mut http_requests = Vec::new();
    let mut websocket_requests = Vec::new();

    for (index, item) in obj.get("item").and_then(Value::as_array).into_iter().flatten().enumerate()
    {
        collect_postman_item(
            item,
            None,
            format!("root-{index}"),
            &mut folders,
            &mut http_requests,
            &mut websocket_requests,
        )?;
    }

    Ok(Some(ImportResponse {
        resources: Some(ImportResources {
            workspaces: vec![],
            environments: vec![],
            folders,
            http_requests,
            grpc_requests: vec![],
            websocket_requests,
        }),
        error: None,
    }))
}

fn collect_postman_item(
    item: &Value,
    parent_folder_id: Option<String>,
    unique: String,
    folders: &mut Vec<Folder>,
    http_requests: &mut Vec<HttpRequest>,
    websocket_requests: &mut Vec<WebsocketRequest>,
) -> Result<(), String> {
    let Some(obj) = item.as_object() else {
        return Ok(());
    };

    if let Some(children) = obj.get("item").and_then(Value::as_array) {
        let name = string_field(obj, &["name"]).unwrap_or_else(|| "Imported Folder".to_string());
        let folder = make_folder(name, parent_folder_id.clone(), &unique);
        let folder_id = folder.id.clone();
        folders.push(folder);
        for (index, child) in children.iter().enumerate() {
            collect_postman_item(
                child,
                Some(folder_id.clone()),
                format!("{unique}-{index}"),
                folders,
                http_requests,
                websocket_requests,
            )?;
        }
        return Ok(());
    }

    if obj.get("request").is_some() {
        if let Some(request) = parse_postman_http_request(obj, parent_folder_id.clone(), &unique)? {
            http_requests.push(request);
        }
    }

    if obj.get("event").is_some() && obj.get("request").is_none() {
        if let Some(request) = parse_postman_websocket_request(obj, parent_folder_id, &unique)? {
            websocket_requests.push(request);
        }
    }

    Ok(())
}

fn parse_postman_http_request(
    item: &Map<String, Value>,
    folder_id: Option<String>,
    unique: &str,
) -> Result<Option<HttpRequest>, String> {
    let Some(request_obj) = item.get("request").and_then(Value::as_object) else {
        return Ok(None);
    };

    let url = resolve_postman_url(request_obj.get("url"));
    if url.is_empty() {
        return Ok(None);
    }

    let name = string_field(item, &["name"]).unwrap_or_else(|| strip_query(&url));
    let method = string_field(request_obj, &["method"]).unwrap_or_else(|| "GET".to_string());
    let mut request = make_http_request(name, method, strip_query(&url), folder_id, unique);
    request.url_parameters = parse_url_parameters(&url);
    request.headers = parse_headers(request_obj.get("header"));
    request.description =
        description_text(item.get("description").or_else(|| request_obj.get("description")));

    if let Some(body) = request_obj.get("body").and_then(Value::as_object) {
        let content_type = content_type(&request.headers);
        apply_postman_body(body, content_type.as_deref(), &mut request);
    }

    Ok(Some(request))
}

fn parse_postman_websocket_request(
    item: &Map<String, Value>,
    folder_id: Option<String>,
    unique: &str,
) -> Result<Option<WebsocketRequest>, String> {
    let Some(events) = item.get("event").and_then(Value::as_array) else {
        return Ok(None);
    };

    let url = item
        .get("url")
        .and_then(Value::as_str)
        .or_else(|| {
            item.get("request")
                .and_then(Value::as_object)
                .and_then(|request| request.get("url"))
                .and_then(Value::as_str)
        })
        .unwrap_or_default()
        .to_string();
    if !url.starts_with("ws://") && !url.starts_with("wss://") {
        return Ok(None);
    }

    let message = events
        .iter()
        .filter_map(Value::as_object)
        .filter_map(|event| event.get("script"))
        .filter_map(Value::as_object)
        .filter_map(|script| script.get("exec"))
        .find_map(|exec| {
            exec.as_array()
                .map(|lines| lines.iter().filter_map(Value::as_str).collect::<Vec<_>>().join("\n"))
        })
        .unwrap_or_default();

    let name = string_field(item, &["name"]).unwrap_or_else(|| strip_query(&url));
    let mut request = make_websocket_request(name, strip_query(&url), message, folder_id, unique);
    request.url_parameters = parse_url_parameters(&url);
    Ok(Some(request))
}

fn resolve_postman_url(value: Option<&Value>) -> String {
    match value {
        Some(Value::String(raw)) => raw.clone(),
        Some(Value::Object(obj)) => {
            if let Some(raw) = string_field(obj, &["raw"]) {
                return raw;
            }

            let protocol = string_field(obj, &["protocol"]).unwrap_or_else(|| "https".to_string());
            let host = obj
                .get("host")
                .and_then(Value::as_array)
                .map(|parts| parts.iter().filter_map(Value::as_str).collect::<Vec<_>>().join("."))
                .unwrap_or_default();
            let path = obj
                .get("path")
                .and_then(Value::as_array)
                .map(|parts| parts.iter().filter_map(Value::as_str).collect::<Vec<_>>().join("/"))
                .unwrap_or_default();

            let mut raw = if path.is_empty() {
                format!("{protocol}://{host}")
            } else {
                format!("{protocol}://{host}/{path}")
            };

            if let Some(query) = obj.get("query").and_then(Value::as_array) {
                let pairs = query
                    .iter()
                    .filter_map(Value::as_object)
                    .filter_map(|pair| {
                        let key = string_field(pair, &["key"])?;
                        let value = string_field(pair, &["value"]).unwrap_or_default();
                        Some(format!("{key}={value}"))
                    })
                    .collect::<Vec<_>>();
                if !pairs.is_empty() {
                    raw.push('?');
                    raw.push_str(&pairs.join("&"));
                }
            }

            raw
        }
        _ => String::new(),
    }
}

fn apply_postman_body(
    body: &Map<String, Value>,
    content_type: Option<&str>,
    request: &mut HttpRequest,
) {
    let mode = string_field(body, &["mode"]).unwrap_or_default();
    match mode.as_str() {
        "graphql" => {
            request.body_type = Some("graphql".to_string());
            if let Some(graphql) = body.get("graphql").and_then(Value::as_object) {
                if let Some(query) = string_field(graphql, &["query"]) {
                    request.body.insert("query".to_string(), Value::String(query));
                }
                if let Some(variables) = graphql.get("variables") {
                    match variables {
                        Value::String(v) => {
                            request.body.insert("variables".to_string(), Value::String(v.clone()));
                        }
                        other => {
                            request.body.insert(
                                "variables".to_string(),
                                Value::String(
                                    serde_json::to_string_pretty(other).unwrap_or_default(),
                                ),
                            );
                        }
                    }
                }
            }
        }
        "urlencoded" | "formdata" => {
            request.body_type = Some(if mode == "urlencoded" {
                "application/x-www-form-urlencoded".to_string()
            } else {
                "multipart/form-data".to_string()
            });
            let entries = body
                .get(mode.as_str())
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(Value::as_object)
                .filter_map(|pair| {
                    let name = string_field(pair, &["key"])?;
                    let value = string_field(pair, &["value"]).unwrap_or_default();
                    Some(serde_json::json!({
                        "enabled": !pair.get("disabled").and_then(Value::as_bool).unwrap_or(false),
                        "name": name,
                        "value": value,
                    }))
                })
                .collect::<Vec<_>>();
            request.body.insert("form".to_string(), Value::Array(entries));
        }
        _ => {
            let raw = string_field(body, &["raw"]).unwrap_or_default();
            if raw.is_empty() {
                return;
            }

            request.body_type = infer_body_type(&raw, content_type);
            request.body.insert("text".to_string(), Value::String(raw));
        }
    }
}

fn content_type(headers: &[yakumo_models::models::HttpRequestHeader]) -> Option<String> {
    headers
        .iter()
        .find(|header| header.name.eq_ignore_ascii_case("content-type"))
        .map(|header| header.value.clone())
}

fn description_text(value: Option<&Value>) -> String {
    match value {
        Some(Value::String(text)) => text.clone(),
        Some(Value::Object(obj)) => string_field(obj, &["content"]).unwrap_or_default(),
        _ => String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::import_postman;

    #[test]
    fn imports_nested_postman_collection() {
        let json = serde_json::json!({
            "info": { "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
            "item": [{
                "name": "Users",
                "item": [{
                    "name": "Get Users",
                    "request": {
                        "method": "GET",
                        "url": { "raw": "https://api.example.com/users?page=1" }
                    }
                }]
            }]
        });

        let response = import_postman(&json).unwrap().unwrap();
        let resources = response.resources.unwrap();
        assert_eq!(resources.folders.len(), 1);
        assert_eq!(resources.http_requests.len(), 1);
        assert_eq!(resources.http_requests[0].url, "https://api.example.com/users");
        assert_eq!(resources.http_requests[0].url_parameters[0].name, "page");
    }
}
