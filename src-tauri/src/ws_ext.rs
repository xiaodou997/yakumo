//! WebSocket Tauri command wrappers
//! These wrap the core yakumo-ws functionality for Tauri IPC.

use crate::BuiltinTemplateCallback;
use crate::error::Error;
use crate::error::Result;
use crate::models_ext::QueryManagerExt;
use http::HeaderMap;
use log::{debug, info, warn};
use std::str::FromStr;
use tauri::http::HeaderValue;
use tauri::{AppHandle, Manager, Runtime, State, WebviewWindow, command};
use tokio::sync::{Mutex, mpsc};
use tokio_tungstenite::tungstenite::Message;
use url::Url;
use yakumo_crypto::manager::EncryptionManager;
use yakumo_features::auth;
use yakumo_http::cookies::CookieStore;
use yakumo_http::path_placeholders::apply_path_placeholders;
use yakumo_models::models::{
    HttpResponseHeader, WebsocketConnection, WebsocketConnectionState, WebsocketEvent,
    WebsocketEventType, WebsocketRequest,
};
use yakumo_models::util::UpdateSource;
use yakumo_templates::strip_json_comments::maybe_strip_json_comments;
use yakumo_templates::{RenderErrorBehavior, RenderOptions};
use yakumo_tls::find_client_certificate;
use yakumo_ws::{WebsocketManager, render_websocket_request};

fn parse_header(name: &str, value: &str) -> Result<(http::HeaderName, HeaderValue)> {
    let name = http::HeaderName::from_str(name)
        .map_err(|e| Error::GenericError(format!("Invalid header name '{name}': {e}")))?;
    let value = HeaderValue::from_str(value)
        .map_err(|e| Error::GenericError(format!("Invalid header value for '{name}': {e}")))?;
    Ok((name, value))
}

#[command]
pub async fn cmd_ws_delete_connections<R: Runtime>(
    request_id: &str,
    app_handle: AppHandle<R>,
    window: WebviewWindow<R>,
) -> Result<()> {
    Ok(app_handle.db().delete_all_websocket_connections_for_request(
        request_id,
        &UpdateSource::from_window_label(window.label()),
    )?)
}

#[command]
pub async fn cmd_ws_send<R: Runtime>(
    connection_id: &str,
    environment_id: Option<&str>,
    app_handle: AppHandle<R>,
    window: WebviewWindow<R>,
    ws_manager: State<'_, Mutex<WebsocketManager>>,
) -> Result<WebsocketConnection> {
    let connection = app_handle.db().get_websocket_connection(connection_id)?;
    let unrendered_request = app_handle.db().get_websocket_request(&connection.request_id)?;
    let environment_chain = app_handle.db().resolve_environments(
        &unrendered_request.workspace_id,
        unrendered_request.folder_id.as_deref(),
        environment_id,
    )?;
    let (resolved_request, _auth_context_id) =
        resolve_websocket_request(&window, &unrendered_request)?;

    let cb = BuiltinTemplateCallback::for_workspace(
        app_handle.state::<EncryptionManager>().inner().clone(),
        unrendered_request.workspace_id.clone(),
    );
    let request = render_websocket_request(
        &resolved_request,
        environment_chain,
        &cb,
        &RenderOptions { error_behavior: RenderErrorBehavior::Throw },
    )
    .await?;

    let message = maybe_strip_json_comments(&request.message);

    let mut ws_manager = ws_manager.lock().await;
    ws_manager.send(&connection.id, Message::Text(message.clone().into())).await?;

    app_handle.db().upsert_websocket_event(
        &WebsocketEvent {
            connection_id: connection.id.clone(),
            request_id: request.id.clone(),
            workspace_id: connection.workspace_id.clone(),
            is_server: false,
            message_type: WebsocketEventType::Text,
            message: message.into(),
            ..Default::default()
        },
        &UpdateSource::from_window_label(window.label()),
    )?;

    Ok(connection)
}

#[command]
pub async fn cmd_ws_close<R: Runtime>(
    connection_id: &str,
    app_handle: AppHandle<R>,
    window: WebviewWindow<R>,
    ws_manager: State<'_, Mutex<WebsocketManager>>,
) -> Result<WebsocketConnection> {
    let connection = {
        let db = app_handle.db();
        let connection = db.get_websocket_connection(connection_id)?;
        db.upsert_websocket_connection(
            &WebsocketConnection { state: WebsocketConnectionState::Closing, ..connection },
            &UpdateSource::from_window_label(window.label()),
        )?
    };

    let mut ws_manager = ws_manager.lock().await;
    if let Err(e) = ws_manager.close(&connection.id).await {
        warn!("Failed to close WebSocket connection: {e:?}");
    };

    Ok(connection)
}

#[command]
pub async fn cmd_ws_connect<R: Runtime>(
    request_id: &str,
    environment_id: Option<&str>,
    cookie_jar_id: Option<&str>,
    app_handle: AppHandle<R>,
    window: WebviewWindow<R>,
    ws_manager: State<'_, Mutex<WebsocketManager>>,
) -> Result<WebsocketConnection> {
    let unrendered_request = app_handle.db().get_websocket_request(request_id)?;
    let environment_chain = app_handle.db().resolve_environments(
        &unrendered_request.workspace_id,
        unrendered_request.folder_id.as_deref(),
        environment_id,
    )?;
    let workspace = app_handle.db().get_workspace(&unrendered_request.workspace_id)?;
    let settings = app_handle.db().get_settings();
    let (resolved_request, _auth_context_id) =
        resolve_websocket_request(&window, &unrendered_request)?;

    let cb = BuiltinTemplateCallback::for_workspace(
        app_handle.state::<EncryptionManager>().inner().clone(),
        unrendered_request.workspace_id.clone(),
    );
    let request = render_websocket_request(
        &resolved_request,
        environment_chain.clone(),
        &cb,
        &RenderOptions { error_behavior: RenderErrorBehavior::Throw },
    )
    .await?;

    let connection = app_handle.db().upsert_websocket_connection(
        &WebsocketConnection {
            workspace_id: request.workspace_id.clone(),
            request_id: request_id.to_string(),
            ..Default::default()
        },
        &UpdateSource::from_window_label(window.label()),
    )?;

    let (mut url, url_parameters) = apply_path_placeholders(&request.url, &request.url_parameters);
    if !url.starts_with("ws://") && !url.starts_with("wss://") {
        url.insert_str(0, "ws://");
    }

    // Add URL parameters to URL
    let mut url = match Url::parse(&url) {
        Ok(url) => url,
        Err(e) => {
            return Ok(app_handle.db().upsert_websocket_connection(
                &WebsocketConnection {
                    error: Some(format!("Failed to parse URL {}", e.to_string())),
                    state: WebsocketConnectionState::Closed,
                    ..connection
                },
                &UpdateSource::from_window_label(window.label()),
            )?);
        }
    };

    let mut headers = HeaderMap::new();

    for h in request.headers.clone() {
        if h.name.is_empty() && h.value.is_empty() {
            continue;
        }

        if !h.enabled {
            continue;
        }

        let (name, value) = parse_header(&h.name, &h.value)?;
        headers.insert(name, value);
    }

    // Handle built-in authentication
    match request.authentication_type.clone() {
        None => {
            // No authentication found. Not even inherited
        }
        Some(authentication_type) if authentication_type == "none" => {
            // Explicitly no authentication
        }
        Some(authentication_type) => {
            // Convert BTreeMap to HashMap for auth module
            let auth_values: std::collections::HashMap<String, serde_json::Value> =
                request.authentication.iter().map(|(k, v)| (k.clone(), v.clone())).collect();

            // Use built-in authentication handlers
            let auth_result = auth::apply_auth(&authentication_type, &auth_values);

            // Add headers from auth result
            for header in auth_result.headers {
                match (
                    http::HeaderName::from_str(&header.name),
                    HeaderValue::from_str(&header.value),
                ) {
                    (Ok(n), Ok(v)) => {
                        headers.insert(n, v);
                    }
                    _ => continue,
                };
            }
        }
    }

    // Add cookies to WS HTTP Upgrade
    if let Some(id) = cookie_jar_id {
        let cookie_jar = app_handle.db().get_cookie_jar(&id)?;
        let store = CookieStore::from_cookies(cookie_jar.cookies);

        // Convert WS URL -> HTTP URL because our cookie store matches based on
        // Path/HttpOnly/Secure attributes even though WS upgrades are HTTP requests
        let http_url = convert_ws_url_to_http(&url);
        if let Some(cookie_header_value) = store.get_cookie_header(&http_url) {
            debug!("Inserting cookies into WS upgrade to {}: {}", url, cookie_header_value);
            let cookie_value = HeaderValue::from_str(&cookie_header_value).map_err(|e| {
                Error::GenericError(format!(
                    "Invalid cookie header value for WebSocket upgrade: {e}"
                ))
            })?;
            headers.insert(http::HeaderName::from_static("cookie"), cookie_value);
        }
    }

    let (receive_tx, mut receive_rx) = mpsc::channel::<Message>(128);
    let mut ws_manager = ws_manager.lock().await;

    {
        let valid_query_pairs = url_parameters
            .into_iter()
            .filter(|p| p.enabled && !p.name.is_empty())
            .collect::<Vec<_>>();
        // NOTE: Only mutate query pairs if there are any, or it will append an empty `?` to the URL
        if !valid_query_pairs.is_empty() {
            let mut query_pairs = url.query_pairs_mut();
            for p in valid_query_pairs {
                query_pairs.append_pair(p.name.as_str(), p.value.as_str());
            }
        }
    }

    let client_cert = find_client_certificate(url.as_str(), &settings.client_certificates);

    let response = match ws_manager
        .connect(
            &connection.id,
            url.as_str(),
            headers,
            receive_tx,
            workspace.setting_validate_certificates,
            client_cert,
        )
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return Ok(app_handle.db().upsert_websocket_connection(
                &WebsocketConnection {
                    error: Some(e.to_string()),
                    state: WebsocketConnectionState::Closed,
                    ..connection
                },
                &UpdateSource::from_window_label(window.label()),
            )?);
        }
    };

    app_handle.db().upsert_websocket_event(
        &WebsocketEvent {
            connection_id: connection.id.clone(),
            request_id: request.id.clone(),
            workspace_id: connection.workspace_id.clone(),
            is_server: false,
            message_type: WebsocketEventType::Open,
            ..Default::default()
        },
        &UpdateSource::from_window_label(window.label()),
    )?;

    let response_headers = response
        .headers()
        .into_iter()
        .map(|(name, value)| HttpResponseHeader {
            name: name.to_string(),
            value: value
                .to_str()
                .map(str::to_owned)
                .unwrap_or_else(|_| String::from_utf8_lossy(value.as_bytes()).into_owned()),
        })
        .collect::<Vec<HttpResponseHeader>>();

    let connection = app_handle.db().upsert_websocket_connection(
        &WebsocketConnection {
            state: WebsocketConnectionState::Connected,
            headers: response_headers,
            status: response.status().as_u16() as i32,
            url: request.url.clone(),
            ..connection
        },
        &UpdateSource::from_window_label(window.label()),
    )?;

    {
        let connection_id = connection.id.clone();
        let request_id = request.id.to_string();
        let workspace_id = request.workspace_id.clone();
        let connection = connection.clone();
        let window_label = window.label().to_string();
        let mut has_written_close = false;
        tokio::spawn(async move {
            while let Some(message) = receive_rx.recv().await {
                if let Message::Close(_) = message {
                    has_written_close = true;
                }

                if let Err(err) = app_handle.db().upsert_websocket_event(
                    &WebsocketEvent {
                        connection_id: connection_id.clone(),
                        request_id: request_id.clone(),
                        workspace_id: workspace_id.clone(),
                        is_server: true,
                        message_type: match message {
                            Message::Text(_) => WebsocketEventType::Text,
                            Message::Binary(_) => WebsocketEventType::Binary,
                            Message::Ping(_) => WebsocketEventType::Ping,
                            Message::Pong(_) => WebsocketEventType::Pong,
                            Message::Close(_) => WebsocketEventType::Close,
                            // Raw frame will never happen during a read
                            Message::Frame(_) => WebsocketEventType::Frame,
                        },
                        message: message.into_data().into(),
                        ..Default::default()
                    },
                    &UpdateSource::from_window_label(&window_label),
                ) {
                    warn!("Failed to persist websocket event for {connection_id}: {err}");
                }
            }
            info!("Websocket connection closed");
            if !has_written_close {
                if let Err(err) = app_handle.db().upsert_websocket_event(
                    &WebsocketEvent {
                        connection_id: connection_id.clone(),
                        request_id: request_id.clone(),
                        workspace_id: workspace_id.clone(),
                        is_server: true,
                        message_type: WebsocketEventType::Close,
                        ..Default::default()
                    },
                    &UpdateSource::from_window_label(&window_label),
                ) {
                    warn!("Failed to persist websocket close event for {connection_id}: {err}");
                }
            }
            if let Err(err) = app_handle.db().upsert_websocket_connection(
                &WebsocketConnection {
                    workspace_id: request.workspace_id.clone(),
                    request_id: request_id.to_string(),
                    state: WebsocketConnectionState::Closed,
                    ..connection
                },
                &UpdateSource::from_window_label(&window_label),
            ) {
                warn!("Failed to persist websocket connection close for {connection_id}: {err}");
            }
        });
    }

    Ok(connection)
}

/// Resolve inherited authentication and headers for a websocket request
fn resolve_websocket_request<R: Runtime>(
    window: &WebviewWindow<R>,
    request: &WebsocketRequest,
) -> Result<(WebsocketRequest, String)> {
    let mut new_request = request.clone();

    let (authentication_type, authentication, authentication_context_id) =
        window.db().resolve_auth_for_websocket_request(request)?;
    new_request.authentication_type = authentication_type;
    new_request.authentication = authentication;

    let headers = window.db().resolve_headers_for_websocket_request(request)?;
    new_request.headers = headers;

    Ok((new_request, authentication_context_id))
}

/// Convert WS URL to HTTP URL for cookie filtering
/// WebSocket upgrade requests are HTTP requests initially, so HttpOnly cookies should apply
fn convert_ws_url_to_http(ws_url: &Url) -> Url {
    let mut http_url = ws_url.clone();

    match ws_url.scheme() {
        "ws" => {
            if http_url.set_scheme("http").is_err() {
                warn!("Failed to convert WebSocket URL scheme from ws to http: {}", ws_url);
            }
        }
        "wss" => {
            if http_url.set_scheme("https").is_err() {
                warn!("Failed to convert WebSocket URL scheme from wss to https: {}", ws_url);
            }
        }
        _ => {
            // Already HTTP/HTTPS, no conversion needed
        }
    }

    http_url
}
