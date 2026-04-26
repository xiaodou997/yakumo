use crate::events::{ImportResources, ImportResponse};
use crate::importer::{make_http_request, parse_headers, string_field};
use serde_json::{Map, Value};

const HTTP_METHODS: &[&str] = &[
    "get", "post", "put", "delete", "patch", "head", "options", "trace",
];

pub fn import_openapi(json: &Value) -> Result<Option<ImportResponse>, String> {
    let Some(obj) = json.as_object() else {
        return Ok(None);
    };

    let kind = if obj.get("openapi").and_then(Value::as_str).is_some() {
        OpenApiKind::V3
    } else if obj.get("swagger").and_then(Value::as_str) == Some("2.0") {
        OpenApiKind::Swagger2
    } else {
        return Ok(None);
    };

    let Some(paths) = obj.get("paths").and_then(Value::as_object) else {
        return Ok(None);
    };

    let base_url = resolve_base_url(obj, kind);
    let mut http_requests = Vec::new();

    for (path, path_item) in paths {
        let Some(path_item) = path_item.as_object() else {
            continue;
        };
        for method in HTTP_METHODS {
            let Some(operation) = path_item.get(*method).and_then(Value::as_object) else {
                continue;
            };
            let request = parse_operation(obj, path_item, path, method, operation, &base_url, kind);
            http_requests.push(request);
        }
    }

    Ok(Some(ImportResponse {
        resources: Some(ImportResources {
            workspace: None,
            environment: None,
            folders: vec![],
            http_requests,
            grpc_requests: vec![],
            websocket_requests: vec![],
        }),
        error: None,
    }))
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum OpenApiKind {
    V3,
    Swagger2,
}

fn resolve_base_url(obj: &Map<String, Value>, kind: OpenApiKind) -> String {
    match kind {
        OpenApiKind::V3 => obj
            .get("servers")
            .and_then(Value::as_array)
            .and_then(|servers| servers.first())
            .and_then(Value::as_object)
            .and_then(|server| string_field(server, &["url"]))
            .unwrap_or_else(|| "https://example.com".to_string()),
        OpenApiKind::Swagger2 => {
            let host = string_field(obj, &["host"]).unwrap_or_else(|| "example.com".to_string());
            let base_path = string_field(obj, &["basePath"]).unwrap_or_default();
            let scheme = obj
                .get("schemes")
                .and_then(Value::as_array)
                .and_then(|schemes| schemes.first())
                .and_then(Value::as_str)
                .unwrap_or("https");
            format!("{scheme}://{host}{base_path}")
        }
    }
}

fn parse_operation(
    root: &Map<String, Value>,
    path_item: &Map<String, Value>,
    path: &str,
    method: &str,
    operation: &Map<String, Value>,
    base_url: &str,
    kind: OpenApiKind,
) -> yakumo_models::models::HttpRequest {
    let name = string_field(operation, &["summary", "operationId"])
        .unwrap_or_else(|| format!("{} {}", method.to_uppercase(), path));
    let url = format!("{}{}", base_url.trim_end_matches('/'), normalize_path(path));
    let unique = format!("{method}:{path}");
    let mut request = make_http_request(name, method.to_uppercase(), url, None, unique);
    request.description = string_field(operation, &["description"]).unwrap_or_default();
    request.url_parameters = path_parameters(path, operation, path_item);
    request.headers = parse_headers(default_header_array(root, operation, kind).as_ref());
    apply_request_body(operation, &mut request, kind);
    request
}

fn normalize_path(path: &str) -> String {
    if path.starts_with('/') {
        path.replace('{', ":").replace('}', "")
    } else {
        format!("/{}", path.replace('{', ":").replace('}', ""))
    }
}

fn path_parameters(
    path: &str,
    operation: &Map<String, Value>,
    path_item: &Map<String, Value>,
) -> Vec<yakumo_models::models::HttpUrlParameter> {
    let mut params = Vec::new();
    for segment in path.split('/') {
        if let Some(name) = segment.strip_prefix('{').and_then(|v| v.strip_suffix('}')) {
            params.push(yakumo_models::models::HttpUrlParameter {
                enabled: true,
                name: format!(":{name}"),
                value: String::new(),
                id: None,
            });
        }
    }

    for parameter in collect_parameters(operation, path_item) {
        let Some(obj) = parameter.as_object() else {
            continue;
        };
        let Some(location) = string_field(obj, &["in"]) else {
            continue;
        };
        if location != "query" {
            continue;
        }

        let Some(name) = string_field(obj, &["name"]) else {
            continue;
        };
        let value = example_string(obj.get("example"))
            .or_else(|| obj.get("schema").and_then(example_from_schema))
            .unwrap_or_default();
        params.push(yakumo_models::models::HttpUrlParameter {
            enabled: true,
            name,
            value,
            id: None,
        });
    }

    params
}

fn collect_parameters<'a>(
    operation: &'a Map<String, Value>,
    path_item: &'a Map<String, Value>,
) -> Vec<&'a Value> {
    path_item
        .get("parameters")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .chain(operation.get("parameters").and_then(Value::as_array).into_iter().flatten())
        .collect()
}

fn default_header_array(
    root: &Map<String, Value>,
    operation: &Map<String, Value>,
    kind: OpenApiKind,
) -> Option<Value> {
    let mut headers = Vec::new();
    match kind {
        OpenApiKind::V3 => {
            if let Some(content_type) = request_content_type(operation) {
                headers.push(serde_json::json!({ "key": "Content-Type", "value": content_type }));
            }
        }
        OpenApiKind::Swagger2 => {
            let consumes = operation
                .get("consumes")
                .or_else(|| root.get("consumes"))
                .and_then(Value::as_array)
                .and_then(|values| values.first())
                .and_then(Value::as_str);
            if let Some(content_type) = consumes {
                headers.push(serde_json::json!({ "key": "Content-Type", "value": content_type }));
            }
        }
    }
    if headers.is_empty() { None } else { Some(Value::Array(headers)) }
}

fn request_content_type(operation: &Map<String, Value>) -> Option<String> {
    operation
        .get("requestBody")
        .and_then(Value::as_object)
        .and_then(|request_body| request_body.get("content"))
        .and_then(Value::as_object)
        .and_then(|content| content.keys().next().cloned())
}

fn apply_request_body(
    operation: &Map<String, Value>,
    request: &mut yakumo_models::models::HttpRequest,
    kind: OpenApiKind,
) {
    match kind {
        OpenApiKind::V3 => {
            let Some(request_body) = operation.get("requestBody").and_then(Value::as_object) else {
                return;
            };
            let Some(content) = request_body.get("content").and_then(Value::as_object) else {
                return;
            };
            let Some((content_type, schema_value)) = content.iter().next() else {
                return;
            };

            if content_type.contains("graphql") {
                request.body_type = Some("graphql".to_string());
                request.body.insert(
                    "query".to_string(),
                    Value::String(example_string(schema_value.get("example")).unwrap_or_default()),
                );
                return;
            }

            request.body_type = Some(body_type_from_content_type(content_type));
            let body = schema_value
                .get("example")
                .cloned()
                .or_else(|| schema_value.get("schema").and_then(example_json_from_schema))
                .unwrap_or_else(|| Value::Object(Default::default()));
            request.body.insert(
                "text".to_string(),
                Value::String(serde_json::to_string_pretty(&body).unwrap_or_default()),
            );
        }
        OpenApiKind::Swagger2 => {
            let Some(parameter) = operation
                .get("parameters")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .find(|parameter| {
                    parameter.as_object().and_then(|obj| string_field(obj, &["in"])).as_deref()
                        == Some("body")
                })
                .and_then(Value::as_object)
            else {
                return;
            };

            request.body_type = Some("application/json".to_string());
            let body = parameter
                .get("schema")
                .and_then(example_json_from_schema)
                .unwrap_or_else(|| Value::Object(Default::default()));
            request.body.insert(
                "text".to_string(),
                Value::String(serde_json::to_string_pretty(&body).unwrap_or_default()),
            );
        }
    }
}

fn body_type_from_content_type(content_type: &str) -> String {
    if content_type.contains("json") {
        "application/json".to_string()
    } else if content_type.contains("xml") {
        "text/xml".to_string()
    } else if content_type.contains("x-www-form-urlencoded") {
        "application/x-www-form-urlencoded".to_string()
    } else if content_type.contains("multipart/form-data") {
        "multipart/form-data".to_string()
    } else {
        "other".to_string()
    }
}

fn example_string(value: Option<&Value>) -> Option<String> {
    match value {
        Some(Value::String(v)) => Some(v.clone()),
        Some(other) => serde_json::to_string_pretty(other).ok(),
        None => None,
    }
}

fn example_from_schema(schema: &Value) -> Option<String> {
    example_json_from_schema(schema).map(|value| match value {
        Value::String(v) => v,
        other => other.to_string(),
    })
}

fn example_json_from_schema(schema: &Value) -> Option<Value> {
    let obj = schema.as_object()?;
    if let Some(example) = obj.get("example") {
        return Some(example.clone());
    }
    if let Some(default) = obj.get("default") {
        return Some(default.clone());
    }
    if let Some(enum_values) = obj.get("enum").and_then(Value::as_array) {
        return enum_values.first().cloned();
    }
    match string_field(obj, &["type"]).as_deref() {
        Some("object") => {
            let mut built = Map::new();
            if let Some(properties) = obj.get("properties").and_then(Value::as_object) {
                for (key, property) in properties {
                    if let Some(value) = example_json_from_schema(property) {
                        built.insert(key.clone(), value);
                    }
                }
            }
            Some(Value::Object(built))
        }
        Some("array") => {
            obj.get("items").and_then(example_json_from_schema).map(|item| Value::Array(vec![item]))
        }
        Some("integer") => Some(Value::Number(0.into())),
        Some("number") => Some(serde_json::json!(0)),
        Some("boolean") => Some(Value::Bool(true)),
        Some("string") => Some(Value::String(String::new())),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::import_openapi;

    #[test]
    fn imports_openapi_operation() {
        let json = serde_json::json!({
            "openapi": "3.1.0",
            "servers": [{ "url": "https://api.example.com/v1" }],
            "paths": {
                "/users/{id}": {
                    "get": {
                        "summary": "Get User",
                        "parameters": [
                            { "name": "expand", "in": "query", "schema": { "type": "string" }, "example": "roles" }
                        ]
                    }
                }
            }
        });

        let response = import_openapi(&json).unwrap().unwrap();
        let resources = response.resources.unwrap();
        assert_eq!(resources.http_requests.len(), 1);
        assert_eq!(resources.http_requests[0].url, "https://api.example.com/v1/users/:id");
        assert_eq!(resources.http_requests[0].url_parameters.len(), 2);
    }
}
