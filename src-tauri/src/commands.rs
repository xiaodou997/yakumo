use crate::encoding::read_response_body;
use crate::error::{Error, Result};
use base64::Engine;
use base64::prelude::BASE64_STANDARD;
use serde_json::{Value, json};
use tauri::{Manager, Runtime, State, WebviewWindow, command};
use tauri_plugin_clipboard_manager::ClipboardExt;
use yakumo_crypto::manager::EncryptionManager;
use yakumo_features::actions::{copy_curl, copy_grpcurl};
use yakumo_features::auth::{get_authentication_config, get_authentication_summaries};
use yakumo_features::events::{
    GetThemesResponse, HttpAuthenticationConfig, HttpAuthenticationSummary,
};
use yakumo_features::importer::curl;
use yakumo_features::themes::all_themes;
use yakumo_models::models::{GrpcRequest, HttpRequest, HttpRequestHeader, HttpResponse};
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
pub(crate) async fn cmd_get_http_authentication_summaries() -> Result<Vec<HttpAuthenticationSummary>>
{
    Ok(get_authentication_summaries())
}

#[command]
pub(crate) async fn cmd_get_http_authentication_config(
    auth_name: String,
) -> Result<Option<HttpAuthenticationConfig>> {
    Ok(get_authentication_config(&auth_name))
}

#[command]
pub(crate) async fn cmd_http_response_body(
    response: HttpResponse,
    filter: Option<String>,
) -> Result<Value> {
    let Some(body_path) = response.body_path else {
        return Ok(json!({ "content": "" }));
    };

    let content_type = response
        .headers
        .iter()
        .find(|h| h.name.eq_ignore_ascii_case("content-type"))
        .map(|h| h.value.as_str())
        .unwrap_or_default();
    let content = read_response_body(body_path, content_type).await.unwrap_or_default();

    if let Some(filter) = filter.filter(|f| !f.trim().is_empty()) {
        return Ok(json!({
            "content": content,
            "error": format!("Response filters are not implemented yet: {filter}")
        }));
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
        "pluginRefId": "builtin",
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
        "pluginRefId": "builtin",
        "function": function,
    }))
}

#[command]
pub(crate) async fn cmd_http_request_actions() -> Result<Vec<Value>> {
    Ok(vec![json!({
        "pluginRefId": "builtin",
        "actions": [{ "label": "Copy as curl", "icon": "copy" }],
    })])
}

#[command]
pub(crate) async fn cmd_grpc_request_actions() -> Result<Vec<Value>> {
    Ok(vec![json!({
        "pluginRefId": "builtin",
        "actions": [{ "label": "Copy as grpcurl", "icon": "copy" }],
    })])
}

#[command]
pub(crate) async fn cmd_websocket_request_actions() -> Result<Vec<Value>> {
    Ok(vec![json!({ "pluginRefId": "builtin", "actions": [] })])
}

#[command]
pub(crate) async fn cmd_workspace_actions() -> Result<Vec<Value>> {
    Ok(vec![json!({ "pluginRefId": "builtin", "actions": [] })])
}

#[command]
pub(crate) async fn cmd_folder_actions() -> Result<Vec<Value>> {
    Ok(vec![json!({ "pluginRefId": "builtin", "actions": [] })])
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
pub(crate) async fn cmd_call_websocket_request_action(req: Value) -> Result<()> {
    Err(Error::GenericError(format!("Unknown WebSocket request action: {req}")))
}

#[command]
pub(crate) async fn cmd_call_workspace_action(req: Value) -> Result<()> {
    Err(Error::GenericError(format!("Unknown workspace action: {req}")))
}

#[command]
pub(crate) async fn cmd_call_folder_action(req: Value) -> Result<()> {
    Err(Error::GenericError(format!("Unknown folder action: {req}")))
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
        json!({ "name": "timestamp.unix", "description": "Generate the current Unix timestamp.", "previewType": "live", "args": [] }),
        json!({ "name": "timestamp.unixMillis", "description": "Generate the current Unix timestamp in milliseconds.", "previewType": "live", "args": [] }),
        json!({ "name": "timestamp.iso8601", "description": "Generate the current ISO-8601 timestamp.", "previewType": "live", "args": [] }),
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
            "description": "Return the first regex match.",
            "previewType": "live",
            "args": [
                { "type": "text", "name": "input", "label": "Input" },
                { "type": "text", "name": "pattern", "label": "Pattern" }
            ]
        }),
        json!({
            "name": "regex.replace",
            "description": "Replace regex matches.",
            "previewType": "live",
            "args": [
                { "type": "text", "name": "input", "label": "Input" },
                { "type": "text", "name": "pattern", "label": "Pattern" },
                { "type": "text", "name": "replacement", "label": "Replacement" }
            ]
        }),
    ]
}
