use crate::events::{ImportResources, ImportResponse};
use crate::importer::{
    infer_body_type, make_folder, make_http_request, make_websocket_request, parse_url_parameters,
    string_field, strip_query,
};
use serde_json::{Map, Value};
use std::collections::HashMap;
use yakumo_models::models::{HttpRequest, HttpRequestHeader, WebsocketRequest};

pub fn import_insomnia(json: &Value) -> Result<Option<ImportResponse>, String> {
    let Some(obj) = json.as_object() else {
        return Ok(None);
    };

    let resources = match obj.get("resources").and_then(Value::as_array) {
        Some(resources) => resources,
        None => return Ok(None),
    };

    let export_format = obj
        .get("__export_format")
        .and_then(Value::as_u64)
        .or_else(|| obj.get("__export_source").and_then(|_| Some(4)))
        .unwrap_or(0);
    if export_format < 4 {
        return Ok(None);
    }

    let mut folders = Vec::new();
    let mut http_requests = Vec::new();
    let mut websocket_requests = Vec::new();
    let mut folder_id_map = HashMap::new();

    for resource in resources {
        let Some(item) = resource.as_object() else {
            continue;
        };
        if item.get("_type").and_then(Value::as_str) == Some("request_group") {
            let unique = item.get("_id").and_then(Value::as_str).unwrap_or("group");
            let parent = item
                .get("parentId")
                .and_then(Value::as_str)
                .and_then(|id| folder_id_map.get(id).cloned());
            let folder = make_folder(
                string_field(item, &["name"]).unwrap_or_else(|| "Imported Folder".to_string()),
                parent,
                unique,
            );
            folder_id_map.insert(unique.to_string(), folder.id.clone());
            folders.push(folder);
        }
    }

    for resource in resources {
        let Some(item) = resource.as_object() else {
            continue;
        };
        match item.get("_type").and_then(Value::as_str) {
            Some("request") => {
                if let Some(request) = parse_insomnia_http_request(item, &folder_id_map)? {
                    http_requests.push(request);
                }
            }
            Some("websocket_request") => {
                if let Some(request) = parse_insomnia_websocket_request(item, &folder_id_map)? {
                    websocket_requests.push(request);
                }
            }
            _ => {}
        }
    }

    Ok(Some(ImportResponse {
        resources: Some(ImportResources {
            workspace: None,
            environment: None,
            folders,
            http_requests,
            grpc_requests: vec![],
            websocket_requests,
        }),
        error: None,
    }))
}

fn parse_insomnia_http_request(
    item: &Map<String, Value>,
    folder_id_map: &HashMap<String, String>,
) -> Result<Option<HttpRequest>, String> {
    let url = string_field(item, &["url"]).unwrap_or_default();
    if url.is_empty() || url.starts_with("ws://") || url.starts_with("wss://") {
        return Ok(None);
    }

    let unique = item.get("_id").and_then(Value::as_str).unwrap_or("request");
    let folder_id =
        item.get("parentId").and_then(Value::as_str).and_then(|id| folder_id_map.get(id).cloned());
    let name = string_field(item, &["name"]).unwrap_or_else(|| strip_query(&url));
    let method = string_field(item, &["method"]).unwrap_or_else(|| "GET".to_string());
    let mut request = make_http_request(name, method, strip_query(&url), folder_id, unique);
    request.url_parameters = parse_url_parameters(&url);
    request.description = string_field(item, &["description"]).unwrap_or_default();
    request.headers = insomnia_headers(item.get("headers"));

    let content_type = request
        .headers
        .iter()
        .find(|header| header.name.eq_ignore_ascii_case("content-type"))
        .map(|header| header.value.clone());
    apply_insomnia_body(item, content_type.as_deref(), &mut request);
    Ok(Some(request))
}

fn parse_insomnia_websocket_request(
    item: &Map<String, Value>,
    folder_id_map: &HashMap<String, String>,
) -> Result<Option<WebsocketRequest>, String> {
    let url = string_field(item, &["url"]).unwrap_or_default();
    if !url.starts_with("ws://") && !url.starts_with("wss://") {
        return Ok(None);
    }

    let unique = item.get("_id").and_then(Value::as_str).unwrap_or("websocket");
    let folder_id =
        item.get("parentId").and_then(Value::as_str).and_then(|id| folder_id_map.get(id).cloned());
    let name = string_field(item, &["name"]).unwrap_or_else(|| strip_query(&url));
    let message = string_field(item, &["body"]).unwrap_or_default();
    let mut request = make_websocket_request(name, strip_query(&url), message, folder_id, unique);
    request.description = string_field(item, &["description"]).unwrap_or_default();
    request.headers = insomnia_headers(item.get("headers"));
    request.url_parameters = parse_url_parameters(&url);
    Ok(Some(request))
}

fn insomnia_headers(value: Option<&Value>) -> Vec<HttpRequestHeader> {
    value
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_object)
        .filter_map(|header| {
            let name = string_field(header, &["name"])?;
            Some(HttpRequestHeader {
                enabled: !header.get("disabled").and_then(Value::as_bool).unwrap_or(false),
                name,
                value: string_field(header, &["value"]).unwrap_or_default(),
                id: None,
            })
        })
        .collect()
}

fn apply_insomnia_body(
    item: &Map<String, Value>,
    content_type: Option<&str>,
    request: &mut HttpRequest,
) {
    let mime_type = string_field(item, &["mimeType"]);
    if let Some(params) = item.get("parameters").and_then(Value::as_array) {
        let form = params
            .iter()
            .filter_map(Value::as_object)
            .filter_map(|pair| {
                let name = string_field(pair, &["name"])?;
                Some(serde_json::json!({
                    "enabled": !pair.get("disabled").and_then(Value::as_bool).unwrap_or(false),
                    "name": name,
                    "value": string_field(pair, &["value"]).unwrap_or_default(),
                }))
            })
            .collect::<Vec<_>>();
        if !form.is_empty() {
            request.body_type = Some("application/x-www-form-urlencoded".to_string());
            request.body.insert("form".to_string(), Value::Array(form));
            return;
        }
    }

    let body = string_field(item, &["body"]).unwrap_or_default();
    if body.is_empty() {
        return;
    }

    request.body_type = infer_body_type(&body, mime_type.as_deref().or(content_type));
    request.body.insert("text".to_string(), Value::String(body));
}

#[cfg(test)]
mod tests {
    use super::import_insomnia;

    #[test]
    fn imports_insomnia_request_group_and_request() {
        let json = serde_json::json!({
            "__export_format": 4,
            "resources": [
                { "_id": "grp_1", "_type": "request_group", "name": "Users" },
                {
                    "_id": "req_1",
                    "_type": "request",
                    "parentId": "grp_1",
                    "name": "List Users",
                    "method": "GET",
                    "url": "https://api.example.com/users?limit=5"
                }
            ]
        });

        let response = import_insomnia(&json).unwrap().unwrap();
        let resources = response.resources.unwrap();
        assert_eq!(resources.folders.len(), 1);
        assert_eq!(resources.http_requests.len(), 1);
        assert_eq!(resources.http_requests[0].folder_id, Some(resources.folders[0].id.clone()));
    }
}
