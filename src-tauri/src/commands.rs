use crate::encoding::decode_response_body;
use crate::error::{Error, Result};
use crate::file_commands::read_body_bytes;
use crate::http_request;
use crate::models_ext::QueryManagerExt;
use base64::Engine;
use base64::prelude::BASE64_STANDARD;
use serde_json::{Value, json};
use tauri::{AppHandle, Manager, Runtime, State, WebviewWindow, command};
use tauri_plugin_clipboard_manager::ClipboardExt;
use yakumo_crypto::manager::EncryptionManager;
use yakumo_features::actions::{self, copy_curl, copy_grpcurl};
use yakumo_features::events::GetThemesResponse;
use yakumo_features::filters;
use yakumo_features::importer::curl;
use yakumo_features::themes::all_themes;
use yakumo_models::models::{
    Folder, GrpcRequest, HttpRequest, HttpRequestHeader, WebsocketRequest, Workspace,
};
use yakumo_models::queries::workspaces::default_headers;
use yakumo_templates::{Parser, Token, Val};

/// Extension trait for accessing the EncryptionManager from Tauri Manager types.
pub trait EncryptionManagerExt<'a, R> {
    fn crypto(&'a self) -> State<'a, EncryptionManager>;
}

impl<'a, R: Runtime, M: Manager<R>> EncryptionManagerExt<'a, R> for M {
    fn crypto(&'a self) -> State<'a, EncryptionManager> {
        self.state::<EncryptionManager>()
    }
}

#[command]
pub(crate) async fn cmd_decrypt_template<R: Runtime>(
    window: WebviewWindow<R>,
    template: &str,
    workspace_id: &str,
) -> Result<String> {
    let encrypted = extract_secure_value(template)?;
    match encrypted {
        Some(value) => decrypt_secure_value(&window.crypto(), workspace_id, &value),
        None => Ok(template.to_string()),
    }
}

#[command]
pub(crate) async fn cmd_secure_template<R: Runtime>(
    _app_handle: tauri::AppHandle<R>,
    window: WebviewWindow<R>,
    template: &str,
    workspace_id: &str,
) -> Result<String> {
    window.crypto().ensure_workspace_key(workspace_id)?;
    let encrypted = window.crypto().encrypt(workspace_id, template.as_bytes())?;
    Ok(format!("${{[ secure(value=b64'{}') ]}}", BASE64_STANDARD.encode(encrypted)))
}

#[command]
pub(crate) async fn cmd_get_themes<R: Runtime>(
    _window: WebviewWindow<R>,
) -> Result<Vec<GetThemesResponse>> {
    // Return built-in themes from yakumo_features
    let themes = all_themes();
    Ok(vec![GetThemesResponse { themes }])
}

#[command]
pub(crate) async fn cmd_enable_encryption<R: Runtime>(
    window: WebviewWindow<R>,
    workspace_id: &str,
) -> Result<()> {
    window.crypto().ensure_workspace_key(workspace_id)?;
    window.crypto().reveal_workspace_key(workspace_id)?;
    Ok(())
}

#[command]
pub(crate) async fn cmd_reveal_workspace_key<R: Runtime>(
    window: WebviewWindow<R>,
    workspace_id: &str,
) -> Result<String> {
    Ok(window.crypto().reveal_workspace_key(workspace_id)?)
}

#[command]
pub(crate) async fn cmd_set_workspace_key<R: Runtime>(
    window: WebviewWindow<R>,
    workspace_id: &str,
    key: &str,
) -> Result<()> {
    window.crypto().set_human_key(workspace_id, key)?;
    Ok(())
}

#[command]
pub(crate) async fn cmd_disable_encryption<R: Runtime>(
    window: WebviewWindow<R>,
    workspace_id: &str,
) -> Result<()> {
    window.crypto().disable_encryption(workspace_id)?;
    Ok(())
}

#[command]
pub(crate) fn cmd_default_headers() -> Vec<HttpRequestHeader> {
    default_headers()
}

#[command]
pub(crate) async fn cmd_get_http_authentication_summaries() -> Result<Vec<Value>> {
    Ok(builtin_http_authentication_summaries())
}

#[command]
pub(crate) async fn cmd_get_http_authentication_config(auth_name: String) -> Result<Option<Value>> {
    Ok(builtin_http_authentication_configs()
        .into_iter()
        .find(|config| config.get("name").and_then(Value::as_str) == Some(auth_name.as_str()))
        .map(|mut config| {
            let name = config.get("name").cloned();
            if let Some(obj) = config.as_object_mut() {
                obj.remove("name");
                obj.insert("sourceId".to_string(), Value::String("builtin".to_string()));
                if let Some(name) = name {
                    obj.insert("_name".to_string(), name);
                }
            }
            config
        }))
}

#[command]
pub(crate) async fn cmd_http_response_body(
    app_handle: AppHandle,
    response_id: &str,
    filter: Option<String>,
) -> Result<Value> {
    let response = app_handle.db().get_http_response(response_id)?;
    let Some(body_path) = response.body_path else {
        return Ok(json!({ "content": "" }));
    };

    let content_type = response
        .headers
        .iter()
        .find(|h| h.name.eq_ignore_ascii_case("content-type"))
        .map(|h| h.value.as_str())
        .unwrap_or_default();
    let body = read_body_bytes(&app_handle, &body_path)?;
    let content = decode_response_body(&body, content_type);

    if let Some(filter) = filter.filter(|f| !f.trim().is_empty()) {
        let filtered = if content_type.contains("json") {
            filters::apply_jsonpath(&content, &filter)
        } else if content_type.contains("xml") || content_type.contains("html") {
            filters::apply_xpath(&content, &filter)
        } else if content.trim_start().starts_with('{') || content.trim_start().starts_with('[') {
            filters::apply_jsonpath(&content, &filter)
        } else if content.trim_start().starts_with('<') {
            filters::apply_xpath(&content, &filter)
        } else {
            Err("Response filter requires JSON, XML, or HTML content".to_string())
        };

        return Ok(match filtered {
            Ok(filtered) => json!({ "content": filtered, "error": Value::Null }),
            Err(err) => json!({ "content": Value::Null, "error": err }),
        });
    }

    Ok(json!({ "content": content }))
}

#[command]
pub(crate) async fn cmd_curl_to_request(
    command: &str,
    workspace_id: Option<&str>,
) -> Result<HttpRequest> {
    let imported = curl::import_curl(command).map_err(Error::GenericError)?;
    let request = imported
        .and_then(|r| r.resources)
        .and_then(|mut r| r.http_requests.pop())
        .ok_or_else(|| Error::GenericError("No HTTP request found in curl command".to_string()))?;

    Ok(HttpRequest {
        workspace_id: workspace_id.unwrap_or(&request.workspace_id).to_string(),
        ..request
    })
}

#[command]
pub(crate) async fn cmd_template_function_summaries() -> Result<Vec<Value>> {
    Ok(vec![json!({
        "sourceId": "builtin",
        "functions": builtin_template_functions(),
    })])
}

#[command]
pub(crate) async fn cmd_template_function_config(function_name: &str) -> Result<Value> {
    let function = builtin_template_functions()
        .into_iter()
        .find(|f| f.get("name").and_then(Value::as_str) == Some(function_name))
        .ok_or_else(|| {
            Error::GenericError(format!("Unknown template function: {function_name}"))
        })?;

    Ok(json!({
        "sourceId": "builtin",
        "function": function,
    }))
}

#[command]
pub(crate) async fn cmd_http_request_actions() -> Result<Vec<Value>> {
    Ok(vec![json!({
        "sourceId": "builtin",
        "actions": actions::http_request_actions(),
    })])
}

#[command]
pub(crate) async fn cmd_grpc_request_actions() -> Result<Vec<Value>> {
    Ok(vec![json!({
        "sourceId": "builtin",
        "actions": actions::grpc_request_actions(),
    })])
}

#[command]
pub(crate) async fn cmd_websocket_request_actions() -> Result<Vec<Value>> {
    Ok(vec![json!({ "sourceId": "builtin", "actions": actions::websocket_request_actions() })])
}

#[command]
pub(crate) async fn cmd_workspace_actions() -> Result<Vec<Value>> {
    Ok(vec![json!({ "sourceId": "builtin", "actions": actions::workspace_actions() })])
}

#[command]
pub(crate) async fn cmd_folder_actions() -> Result<Vec<Value>> {
    Ok(vec![json!({ "sourceId": "builtin", "actions": actions::folder_actions() })])
}

#[command]
pub(crate) async fn cmd_call_http_request_action<R: Runtime>(
    window: WebviewWindow<R>,
    req: Value,
) -> Result<()> {
    let index = req.get("index").and_then(Value::as_u64).unwrap_or(0);
    if index != 0 {
        return Err(Error::GenericError(format!("Unknown HTTP request action index: {index}")));
    }

    let request: HttpRequest = serde_json::from_value(
        req.get("args").and_then(|v| v.get("httpRequest")).cloned().ok_or_else(|| {
            Error::GenericError("Missing httpRequest action argument".to_string())
        })?,
    )?;
    window.clipboard().write_text(copy_curl::request_to_curl(&request))?;
    Ok(())
}

#[command]
pub(crate) async fn cmd_call_grpc_request_action<R: Runtime>(
    window: WebviewWindow<R>,
    req: Value,
) -> Result<()> {
    let index = req.get("index").and_then(Value::as_u64).unwrap_or(0);
    if index != 0 {
        return Err(Error::GenericError(format!("Unknown gRPC request action index: {index}")));
    }

    let request: GrpcRequest = serde_json::from_value(
        req.get("args").and_then(|v| v.get("grpcRequest")).cloned().ok_or_else(|| {
            Error::GenericError("Missing grpcRequest action argument".to_string())
        })?,
    )?;
    window.clipboard().write_text(copy_grpcurl::request_to_grpcurl(&request))?;
    Ok(())
}

#[command]
pub(crate) async fn cmd_call_websocket_request_action<R: Runtime>(
    window: WebviewWindow<R>,
    req: Value,
) -> Result<()> {
    let index = req.get("index").and_then(Value::as_u64).unwrap_or(0);
    let request: WebsocketRequest = serde_json::from_value(
        req.get("args").and_then(|v| v.get("websocketRequest")).cloned().ok_or_else(|| {
            Error::GenericError("Missing websocketRequest action argument".to_string())
        })?,
    )?;

    match index {
        0 => {
            window.clipboard().write_text(request.url)?;
            Ok(())
        }
        _ => Err(Error::GenericError(format!("Unknown WebSocket request action index: {index}"))),
    }
}

#[command]
pub(crate) async fn cmd_call_workspace_action<R: Runtime>(
    window: WebviewWindow<R>,
    req: Value,
) -> Result<()> {
    let index = req.get("index").and_then(Value::as_u64).unwrap_or(0);
    let workspace: Workspace = serde_json::from_value(
        req.get("args")
            .and_then(|v| v.get("workspace"))
            .cloned()
            .ok_or_else(|| Error::GenericError("Missing workspace action argument".to_string()))?,
    )?;

    match index {
        0 => {
            window.clipboard().write_text(workspace.id)?;
            Ok(())
        }
        _ => Err(Error::GenericError(format!("Unknown workspace action index: {index}"))),
    }
}

#[command]
pub(crate) async fn cmd_call_folder_action<R: Runtime>(
    app_handle: AppHandle<R>,
    window: WebviewWindow<R>,
    req: Value,
) -> Result<()> {
    let index = req.get("index").and_then(Value::as_u64).unwrap_or(0);
    let folder: Folder = serde_json::from_value(
        req.get("args")
            .and_then(|v| v.get("folder"))
            .cloned()
            .ok_or_else(|| Error::GenericError("Missing folder action argument".to_string()))?,
    )?;

    match index {
        0 => {
            let requests = http_requests_in_folder(&app_handle, &folder)?;
            if requests.is_empty() {
                return Err(Error::GenericError(format!(
                    "Folder '{}' does not contain any HTTP requests to send",
                    folder.name
                )));
            }
            for request in requests {
                let _ = http_request::cmd_send_http_request(
                    app_handle.clone(),
                    window.clone(),
                    None,
                    None,
                    request,
                )
                .await?;
            }
            Ok(())
        }
        1 => {
            window.clipboard().write_text(folder.id)?;
            Ok(())
        }
        _ => Err(Error::GenericError(format!("Unknown folder action index: {index}"))),
    }
}

fn extract_secure_value(template: &str) -> Result<Option<String>> {
    let tokens = Parser::new(template).parse()?;
    let mut non_eof_tokens = tokens.tokens.into_iter().filter(|t| !matches!(t, Token::Eof));
    let Some(Token::Tag { val: Val::Fn { name, args } }) = non_eof_tokens.next() else {
        return Ok(None);
    };

    if non_eof_tokens.next().is_some() || name != "secure" {
        return Ok(None);
    }

    Ok(args.into_iter().find_map(|arg| match (arg.name.as_str(), arg.value) {
        ("value", Val::Str { text }) => Some(text),
        _ => None,
    }))
}

pub(crate) fn decrypt_secure_value(
    encryption_manager: &EncryptionManager,
    workspace_id: &str,
    value: &str,
) -> Result<String> {
    let encrypted = BASE64_STANDARD
        .decode(value)
        .map_err(|e| Error::GenericError(format!("Failed to decode secure template: {e}")))?;
    let decrypted = encryption_manager.decrypt(workspace_id, &encrypted)?;
    String::from_utf8(decrypted)
        .map_err(|e| Error::GenericError(format!("Secure template is not valid UTF-8: {e}")))
}

fn builtin_template_functions() -> Vec<Value> {
    vec![
        json!({
            "name": "secure",
            "description": "Encrypt a sensitive template value with the active workspace key.",
            "previewType": "click",
            "args": [{
                "type": "text",
                "name": "value",
                "label": "Value",
                "password": true,
                "required": true
            }]
        }),
        json!({ "name": "uuid.v4", "description": "Generate a UUID v4.", "previewType": "live", "args": [] }),
        json!({ "name": "uuid.v7", "description": "Generate a UUID v7.", "previewType": "live", "args": [] }),
        json!({
            "name": "uuid.v3",
            "description": "Generate a UUID v3 from a namespace UUID and name.",
            "previewType": "live",
            "args": [
                { "type": "text", "name": "name", "label": "Name" },
                { "type": "text", "name": "namespace", "label": "Namespace UUID", "defaultValue": "6ba7b810-9dad-11d1-80b4-00c04fd430c8" }
            ]
        }),
        json!({
            "name": "uuid.v5",
            "description": "Generate a UUID v5 from a namespace UUID and name.",
            "previewType": "live",
            "args": [
                { "type": "text", "name": "name", "label": "Name" },
                { "type": "text", "name": "namespace", "label": "Namespace UUID", "defaultValue": "6ba7b810-9dad-11d1-80b4-00c04fd430c8" }
            ]
        }),
        json!({
            "name": "timestamp.unix",
            "description": "Generate a Unix timestamp in seconds for now or a provided date.",
            "previewType": "live",
            "args": [
                { "type": "text", "name": "date", "label": "Date", "optional": true, "placeholder": "2026-01-01T12:00:00Z" }
            ]
        }),
        json!({
            "name": "timestamp.unixMillis",
            "description": "Generate a Unix timestamp in milliseconds for now or a provided date.",
            "previewType": "live",
            "args": [
                { "type": "text", "name": "date", "label": "Date", "optional": true, "placeholder": "2026-01-01T12:00:00Z" }
            ]
        }),
        json!({
            "name": "timestamp.iso8601",
            "description": "Generate an ISO-8601 timestamp for now or a provided date.",
            "previewType": "live",
            "args": [
                { "type": "text", "name": "date", "label": "Date", "optional": true, "placeholder": "2026-01-01T12:00:00Z" }
            ]
        }),
        json!({
            "name": "timestamp.format",
            "description": "Format a timestamp or date with a custom pattern.",
            "previewType": "live",
            "args": [
                { "type": "text", "name": "date", "label": "Date", "optional": true, "placeholder": "2026-01-01T12:00:00Z" },
                { "type": "text", "name": "format", "label": "Format", "defaultValue": "yyyy-MM-dd HH:mm:ss" }
            ]
        }),
        json!({
            "name": "timestamp.offset",
            "description": "Offset a timestamp by an expression like '-5d +2h 3m'.",
            "previewType": "live",
            "args": [
                { "type": "text", "name": "date", "label": "Date", "optional": true, "placeholder": "2026-01-01T12:00:00Z" },
                { "type": "text", "name": "expression", "label": "Offset Expression", "placeholder": "-5d +2h 3m" }
            ]
        }),
        json!({
            "name": "hash.sha256",
            "description": "Hash a value with SHA-256.",
            "previewType": "live",
            "args": [{ "type": "text", "name": "input", "label": "Input" }]
        }),
        json!({
            "name": "base64.encode",
            "description": "Base64 encode a value.",
            "previewType": "live",
            "args": [{ "type": "text", "name": "input", "label": "Input" }]
        }),
        json!({
            "name": "random.string",
            "description": "Generate a random string.",
            "previewType": "live",
            "args": [{ "type": "text", "name": "length", "label": "Length", "defaultValue": "16" }]
        }),
        json!({
            "name": "jsonpath.query",
            "description": "Query JSON with JSONPath.",
            "previewType": "live",
            "args": [
                { "type": "editor", "name": "json", "label": "JSON", "language": "json" },
                { "type": "text", "name": "path", "label": "JSONPath" }
            ]
        }),
        json!({
            "name": "regex.match",
            "description": "Return whether the text matches the regex pattern.",
            "previewType": "live",
            "args": [
                { "type": "text", "name": "text", "label": "Text" },
                { "type": "text", "name": "pattern", "label": "Pattern" }
            ]
        }),
        json!({
            "name": "regex.extract",
            "description": "Extract the first regex match.",
            "previewType": "live",
            "args": [
                { "type": "text", "name": "text", "label": "Text" },
                { "type": "text", "name": "pattern", "label": "Pattern" }
            ]
        }),
        json!({
            "name": "regex.replace",
            "description": "Replace regex matches.",
            "previewType": "live",
            "args": [
                { "type": "text", "name": "text", "label": "Text" },
                { "type": "text", "name": "pattern", "label": "Pattern" },
                { "type": "text", "name": "replacement", "label": "Replacement" }
            ]
        }),
    ]
}

#[cfg(test)]
mod tests {
    use super::{
        builtin_http_authentication_configs, builtin_http_authentication_summaries,
        builtin_template_functions,
    };
    use serde_json::Value;

    fn by_name<'a>(items: &'a [Value], name: &str) -> &'a Value {
        items
            .iter()
            .find(|item| item.get("name").and_then(Value::as_str) == Some(name))
            .unwrap_or_else(|| panic!("missing config for {name}"))
    }

    #[test]
    fn template_metadata_exposes_timestamp_date_arg() {
        let functions = builtin_template_functions();
        let unix = by_name(&functions, "timestamp.unix");
        let args = unix.get("args").and_then(Value::as_array).unwrap();
        assert_eq!(args.len(), 1);
        assert_eq!(args[0].get("name").and_then(Value::as_str), Some("date"));
        assert_eq!(args[0].get("optional").and_then(Value::as_bool), Some(true));
    }

    #[test]
    fn template_metadata_uses_text_arg_for_regex_match() {
        let functions = builtin_template_functions();
        let regex = by_name(&functions, "regex.match");
        let args = regex.get("args").and_then(Value::as_array).unwrap();
        assert_eq!(args[0].get("name").and_then(Value::as_str), Some("text"));
        assert_eq!(args[1].get("name").and_then(Value::as_str), Some("pattern"));
    }

    #[test]
    fn template_metadata_covers_registered_builtin_functions() {
        let functions = builtin_template_functions();
        for name in [
            "secure",
            "uuid.v4",
            "uuid.v7",
            "uuid.v3",
            "uuid.v5",
            "timestamp.unix",
            "timestamp.unixMillis",
            "timestamp.iso8601",
            "timestamp.format",
            "timestamp.offset",
            "hash.sha256",
            "base64.encode",
            "random.string",
            "jsonpath.query",
            "regex.match",
            "regex.extract",
            "regex.replace",
        ] {
            let item = by_name(&functions, name);
            let expected_preview = if name == "secure" { "click" } else { "live" };
            assert_eq!(item.get("previewType").and_then(Value::as_str), Some(expected_preview));
            assert!(item.get("args").and_then(Value::as_array).is_some());
        }
    }

    #[test]
    fn auth_summaries_include_short_labels() {
        let summaries = builtin_http_authentication_summaries();
        let oauth2 = by_name(&summaries, "oauth2");
        assert_eq!(oauth2.get("shortLabel").and_then(Value::as_str), Some("OAuth2"));
    }

    #[test]
    fn auth_config_keeps_expected_defaults() {
        let configs = builtin_http_authentication_configs();
        let jwt = by_name(&configs, "jwt");
        let args = jwt.get("args").and_then(Value::as_array).unwrap();
        let algorithm = args
            .iter()
            .find(|arg| arg.get("name").and_then(Value::as_str) == Some("algorithm"))
            .unwrap();
        assert_eq!(algorithm.get("defaultValue").and_then(Value::as_str), Some("HS256"));

        let oauth2 = by_name(&configs, "oauth2");
        let oauth2_args = oauth2.get("args").and_then(Value::as_array).unwrap();
        let access_token = oauth2_args
            .iter()
            .find(|arg| arg.get("name").and_then(Value::as_str) == Some("accessToken"))
            .unwrap();
        assert_eq!(access_token.get("password").and_then(Value::as_bool), Some(true));
    }
}

fn builtin_http_authentication_summaries() -> Vec<Value> {
    vec![
        json!({
            "name": "apikey",
            "label": "API Key",
            "shortLabel": "API Key",
            "description": "Send an API key in a header or query parameter."
        }),
        json!({
            "name": "basic",
            "label": "Basic Auth",
            "shortLabel": "Basic",
            "description": "Send a Base64-encoded username and password in the Authorization header."
        }),
        json!({
            "name": "bearer",
            "label": "Bearer Token",
            "shortLabel": "Bearer",
            "description": "Send a bearer token in the Authorization header."
        }),
        json!({
            "name": "jwt",
            "label": "JWT",
            "shortLabel": "JWT",
            "description": "Generate and send a JSON Web Token."
        }),
        json!({
            "name": "oauth2",
            "label": "OAuth 2.0",
            "shortLabel": "OAuth2",
            "description": "Send an OAuth 2.0 access token."
        }),
    ]
}

fn builtin_http_authentication_configs() -> Vec<Value> {
    vec![
        json!({
            "name": "basic",
            "args": [
                { "type": "text", "name": "username", "label": "Username" },
                { "type": "text", "name": "password", "label": "Password", "password": true, "secret": true }
            ]
        }),
        json!({
            "name": "bearer",
            "args": [
                { "type": "text", "name": "token", "label": "Token", "password": true, "secret": true }
            ]
        }),
        json!({
            "name": "apikey",
            "args": [
                {
                    "type": "select",
                    "name": "location",
                    "label": "Location",
                    "defaultValue": "header",
                    "options": [
                        { "label": "Header", "value": "header" },
                        { "label": "Query Parameter", "value": "query" }
                    ]
                },
                { "type": "text", "name": "key", "label": "Key Name", "defaultValue": "X-API-Key" },
                { "type": "text", "name": "value", "label": "Value", "password": true, "secret": true }
            ]
        }),
        json!({
            "name": "jwt",
            "args": [
                {
                    "type": "select",
                    "name": "algorithm",
                    "label": "Algorithm",
                    "defaultValue": "HS256",
                    "options": [
                        { "label": "HS256", "value": "HS256" },
                        { "label": "HS384", "value": "HS384" },
                        { "label": "HS512", "value": "HS512" },
                        { "label": "RS256", "value": "RS256" },
                        { "label": "RS384", "value": "RS384" },
                        { "label": "RS512", "value": "RS512" },
                        { "label": "PS256", "value": "PS256" },
                        { "label": "PS384", "value": "PS384" },
                        { "label": "PS512", "value": "PS512" },
                        { "label": "ES256", "value": "ES256" },
                        { "label": "ES384", "value": "ES384" },
                        { "label": "EdDSA", "value": "EdDSA" }
                    ]
                },
                { "type": "text", "name": "secret", "label": "Secret / Private Key", "multiLine": true, "password": true, "secret": true },
                { "type": "checkbox", "name": "secretBase64", "label": "Secret Is Base64" },
                { "type": "editor", "name": "payload", "label": "Payload", "language": "json", "defaultValue": "{}" },
                {
                    "type": "accordion",
                    "label": "Advanced",
                    "inputs": [
                        { "type": "editor", "name": "headers", "label": "Header Claims", "language": "json", "defaultValue": "{}" },
                        {
                            "type": "select",
                            "name": "location",
                            "label": "Token Location",
                            "defaultValue": "header",
                            "options": [
                                { "label": "Header", "value": "header" },
                                { "label": "Query Parameter", "value": "query" }
                            ]
                        },
                        { "type": "text", "name": "name", "label": "Header Name", "defaultValue": "Authorization" },
                        { "type": "text", "name": "headerPrefix", "label": "Header Prefix", "defaultValue": "Bearer" },
                        { "type": "text", "name": "queryName", "label": "Query Parameter Name", "defaultValue": "token" }
                    ]
                }
            ]
        }),
        json!({
            "name": "oauth2",
            "args": [
                { "type": "text", "name": "accessToken", "label": "Access Token", "password": true, "secret": true },
                {
                    "type": "select",
                    "name": "location",
                    "label": "Token Location",
                    "defaultValue": "header",
                    "options": [
                        { "label": "Header", "value": "header" },
                        { "label": "Query Parameter", "value": "query" }
                    ]
                },
                { "type": "text", "name": "name", "label": "Header Name", "defaultValue": "Authorization" },
                { "type": "text", "name": "headerPrefix", "label": "Header Prefix", "defaultValue": "Bearer" },
                { "type": "text", "name": "queryName", "label": "Query Parameter Name", "defaultValue": "token" }
            ]
        }),
    ]
}

fn http_requests_in_folder<R: Runtime>(
    app_handle: &AppHandle<R>,
    folder: &Folder,
) -> Result<Vec<HttpRequest>> {
    let folders = app_handle.db().list_folders(&folder.workspace_id)?;
    let requests = app_handle.db().list_http_requests(&folder.workspace_id)?;
    let mut stack = vec![folder.id.clone()];
    let mut ordered = Vec::new();

    while let Some(folder_id) = stack.pop() {
        ordered.extend(
            requests
                .iter()
                .filter(|request| request.folder_id.as_deref() == Some(folder_id.as_str()))
                .cloned(),
        );
        stack.extend(
            folders
                .iter()
                .filter(|candidate| candidate.folder_id.as_deref() == Some(folder_id.as_str()))
                .map(|candidate| candidate.id.clone()),
        );
    }

    Ok(ordered)
}
