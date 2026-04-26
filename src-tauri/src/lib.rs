extern crate core;
use crate::error::Error::GenericError;
use crate::grpc::{build_metadata, metadata_to_map, resolve_grpc_request};
use crate::models_ext::QueryManagerExt;
use crate::notifications::YakumoNotifier;
use crate::render::{render_grpc_request, render_template};
use crate::updates::YakumoUpdater;
use crate::uri_scheme::handle_deep_link;
use base64::Engine;
use base64::prelude::BASE64_STANDARD;
use error::Result as YakumoResult;
use log::{debug, error, info, warn};
use std::collections::HashMap;
use std::panic;
use std::path::PathBuf;
use std::str::FromStr;
use std::time::Duration;
use tauri::{AppHandle, Emitter, RunEvent, State, WebviewWindow, is_dev};
use tauri::{Listener, Runtime};
use tauri::{Manager, WindowEvent};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_log::fern::colors::ColoredLevelConfig;
use tauri_plugin_log::{Builder, Target, TargetKind, log};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};
use tokio::sync::Mutex;
use tokio::task::block_in_place;
use tokio::time;
use yakumo_crypto::manager::EncryptionManager;
use yakumo_features::events::{Color, ShowToastRequest};
use yakumo_grpc::manager::GrpcHandle;
use yakumo_grpc::{Code, ServiceDefinition, serialize_message};
use yakumo_mac_window::AppHandleMacWindowExt;
use yakumo_models::models::{GrpcConnection, GrpcConnectionState, GrpcEvent, GrpcEventType};
use yakumo_models::util::UpdateSource;
use yakumo_templates::strip_json_comments::strip_json_comments;
use yakumo_templates::{RenderErrorBehavior, RenderOptions, TemplateCallback};
use yakumo_tls::find_client_certificate;

mod commands;
mod encoding;
mod error;
mod file_commands;
mod formatting;
mod git_ext;
mod grpc;
mod history;
mod http_request;
mod import;
mod metadata_commands;
mod models_ext;
mod notifications;
mod path_guard;
mod render;
mod sync_ext;
mod template_commands;
mod update_commands;
mod updates;
mod uri_scheme;
mod window;
mod window_commands;
mod window_menu;
mod ws_ext;

/// Built-in template callback that implements TemplateCallback trait
/// using native Rust implementations.
#[derive(Clone, Default)]
pub struct BuiltinTemplateCallback {
    encryption_manager: Option<EncryptionManager>,
    workspace_id: Option<String>,
}

impl BuiltinTemplateCallback {
    pub fn for_workspace(
        encryption_manager: EncryptionManager,
        workspace_id: impl Into<String>,
    ) -> Self {
        Self {
            encryption_manager: Some(encryption_manager),
            workspace_id: Some(workspace_id.into()),
        }
    }
}

impl TemplateCallback for BuiltinTemplateCallback {
    async fn run(
        &self,
        fn_name: &str,
        args: HashMap<String, serde_json::Value>,
    ) -> yakumo_templates::error::Result<String> {
        use yakumo_features::template::*;

        // Dispatch to appropriate template function
        match fn_name {
            // UUID functions
            "uuid.v4" => uuid::UuidV4
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "uuid.v7" => uuid::UuidV7
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "uuid.v3" => uuid::UuidV3
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "uuid.v5" => uuid::UuidV5
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            // Timestamp functions
            "timestamp.unix" => timestamp::TimestampUnix
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "timestamp.unixMillis" => timestamp::TimestampUnixMillis
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "timestamp.iso8601" => timestamp::TimestampIso8601
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "timestamp.format" => timestamp::TimestampFormat
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "timestamp.offset" => timestamp::TimestampOffset
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            // Hash functions
            "hash.sha256" => hash::HashSha256
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            // Encode functions
            "base64.encode" => encode::Base64Encode
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            // Random functions (only RandomString available)
            "random.string" => random::RandomString
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            // JSONPath functions
            "jsonpath.query" => jsonpath::JsonPathQuery
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            // Regex functions
            "regex.match" => regex::RegexMatch
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "regex.replace" => regex::RegexReplace
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "secure" => {
                let value = args.get("value").and_then(|v| v.as_str()).ok_or_else(|| {
                    yakumo_templates::error::Error::RenderError(
                        "secure() requires a value argument".to_string(),
                    )
                })?;
                let Some(encryption_manager) = &self.encryption_manager else {
                    return Ok(value.to_string());
                };
                let Some(workspace_id) = &self.workspace_id else {
                    return Ok(value.to_string());
                };
                let encrypted = BASE64_STANDARD.decode(value).map_err(|e| {
                    yakumo_templates::error::Error::RenderError(format!(
                        "Failed to decode secure template: {e}"
                    ))
                })?;
                let decrypted = encryption_manager
                    .decrypt(workspace_id, &encrypted)
                    .map_err(|e| yakumo_templates::error::Error::RenderError(e.to_string()))?;
                String::from_utf8(decrypted).map_err(|e| {
                    yakumo_templates::error::Error::RenderError(format!(
                        "Secure template is not valid UTF-8: {e}"
                    ))
                })
            }
            _ => Err(yakumo_templates::error::Error::RenderError(format!(
                "Unknown template function: {fn_name}"
            ))),
        }
    }

    fn transform_arg(
        &self,
        _fn_name: &str,
        _arg_name: &str,
        arg_value: &str,
    ) -> yakumo_templates::error::Result<String> {
        Ok(arg_value.to_string())
    }
}

#[tauri::command]
async fn cmd_grpc_reflect<R: Runtime>(
    request_id: &str,
    environment_id: Option<&str>,
    proto_files: Vec<String>,
    window: WebviewWindow<R>,
    app_handle: AppHandle<R>,
    grpc_handle: State<'_, Mutex<GrpcHandle>>,
) -> YakumoResult<Vec<ServiceDefinition>> {
    let unrendered_request = app_handle.db().get_grpc_request(request_id)?;
    let (resolved_request, auth_context_id) = resolve_grpc_request(&window, &unrendered_request)?;

    let environment_chain = app_handle.db().resolve_environments(
        &unrendered_request.workspace_id,
        unrendered_request.folder_id.as_deref(),
        environment_id,
    )?;
    let workspace = app_handle.db().get_workspace(&unrendered_request.workspace_id)?;

    let template_cb = BuiltinTemplateCallback::for_workspace(
        app_handle.state::<EncryptionManager>().inner().clone(),
        unrendered_request.workspace_id.clone(),
    );
    let req = render_grpc_request(
        &resolved_request,
        environment_chain,
        &template_cb,
        &RenderOptions { error_behavior: RenderErrorBehavior::Throw },
    )
    .await?;

    let uri = safe_uri(&req.url);
    let metadata = build_metadata(&window, &req, &auth_context_id).await?;
    let settings = window.db().get_settings();
    let client_certificate =
        find_client_certificate(req.url.as_str(), &settings.client_certificates);
    let proto_files: Vec<PathBuf> =
        proto_files.iter().map(|p| PathBuf::from_str(p).unwrap()).collect();

    // Always invalidate cached pool when this command is called, to force re-reflection
    let mut handle = grpc_handle.lock().await;
    handle.invalidate_pool(&req.id, &uri, &proto_files);

    Ok(handle
        .services(
            &req.id,
            &uri,
            &proto_files,
            &metadata,
            workspace.setting_validate_certificates,
            client_certificate,
        )
        .await
        .map_err(|e| GenericError(e.to_string()))?)
}

#[tauri::command]
async fn cmd_grpc_go<R: Runtime>(
    request_id: &str,
    environment_id: Option<&str>,
    proto_files: Vec<String>,
    app_handle: AppHandle<R>,
    window: WebviewWindow<R>,
    grpc_handle: State<'_, Mutex<GrpcHandle>>,
) -> YakumoResult<String> {
    let unrendered_request = app_handle.db().get_grpc_request(request_id)?;
    let (resolved_request, auth_context_id) = resolve_grpc_request(&window, &unrendered_request)?;
    let environment_chain = app_handle.db().resolve_environments(
        &unrendered_request.workspace_id,
        unrendered_request.folder_id.as_deref(),
        environment_id,
    )?;
    let workspace = app_handle.db().get_workspace(&unrendered_request.workspace_id)?;

    let template_cb = BuiltinTemplateCallback::for_workspace(
        app_handle.state::<EncryptionManager>().inner().clone(),
        unrendered_request.workspace_id.clone(),
    );
    let request = render_grpc_request(
        &resolved_request,
        environment_chain.clone(),
        &template_cb,
        &RenderOptions { error_behavior: RenderErrorBehavior::Throw },
    )
    .await?;

    let metadata = build_metadata(&window, &request, &auth_context_id).await?;

    // Find matching client certificate for this URL
    let settings = app_handle.db().get_settings();
    let client_cert = find_client_certificate(&request.url, &settings.client_certificates);

    let conn = app_handle.db().upsert_grpc_connection(
        &GrpcConnection {
            workspace_id: request.workspace_id.clone(),
            request_id: request.id.clone(),
            status: -1,
            elapsed: 0,
            state: GrpcConnectionState::Initialized,
            url: request.url.clone(),
            ..Default::default()
        },
        &UpdateSource::from_window_label(window.label()),
    )?;

    let conn_id = conn.id.clone();

    let base_msg = GrpcEvent {
        workspace_id: request.clone().workspace_id,
        request_id: request.clone().id,
        connection_id: conn.clone().id,
        ..Default::default()
    };

    let (in_msg_tx, in_msg_rx) = tauri::async_runtime::channel::<String>(16);
    let maybe_in_msg_tx = std::sync::Mutex::new(Some(in_msg_tx.clone()));
    let (cancelled_tx, mut cancelled_rx) = tokio::sync::watch::channel(false);

    let uri = safe_uri(&request.url);

    let in_msg_stream = tokio_stream::wrappers::ReceiverStream::new(in_msg_rx);

    let (service, method) = {
        let req = request.clone();
        match (req.service, req.method) {
            (Some(service), Some(method)) => (service, method),
            _ => return Err(GenericError("Service and method are required".to_string())),
        }
    };

    let start = std::time::Instant::now();
    let connection = grpc_handle
        .lock()
        .await
        .connect(
            &request.clone().id,
            uri.as_str(),
            &proto_files.iter().map(|p| PathBuf::from_str(p).unwrap()).collect(),
            &metadata,
            workspace.setting_validate_certificates,
            client_cert.clone(),
        )
        .await;

    let connection = match connection {
        Ok(c) => c,
        Err(err) => {
            app_handle.db().upsert_grpc_connection(
                &GrpcConnection {
                    elapsed: start.elapsed().as_millis() as i32,
                    error: Some(err.to_string()),
                    state: GrpcConnectionState::Closed,
                    ..conn.clone()
                },
                &UpdateSource::from_window_label(window.label()),
            )?;
            return Ok(conn_id);
        }
    };

    let method_desc =
        connection.method(&service, &method).await.map_err(|e| GenericError(e.to_string()))?;

    #[derive(serde::Deserialize)]
    enum IncomingMsg {
        Message(String),
        Cancel,
        Commit,
    }

    let event_cb = {
        let cancelled_rx = cancelled_rx.clone();
        let environment_chain = environment_chain.clone();
        let template_cb = template_cb.clone();

        move |ev: tauri::Event| {
            if *cancelled_rx.borrow() {
                // Stream is canceled
                return;
            }

            let mut maybe_in_msg_tx = maybe_in_msg_tx.lock().expect("previous holder not to panic");
            let in_msg_tx = if let Some(in_msg_tx) = maybe_in_msg_tx.as_ref() {
                in_msg_tx
            } else {
                // This would mean that the stream is already committed because
                // we have already dropped the sending half
                return;
            };

            match serde_json::from_str::<IncomingMsg>(ev.payload()) {
                Ok(IncomingMsg::Message(msg)) => {
                    let environment_chain = environment_chain.clone();
                    let msg = block_in_place(|| {
                        tauri::async_runtime::block_on(async {
                            let result = render_template(
                                msg.as_str(),
                                environment_chain,
                                &template_cb,
                                &RenderOptions { error_behavior: RenderErrorBehavior::Throw },
                            )
                            .await;
                            result.expect("Failed to render template")
                        })
                    });
                    let msg = strip_json_comments(&msg);
                    in_msg_tx.try_send(msg.clone()).unwrap();
                }
                Ok(IncomingMsg::Commit) => {
                    maybe_in_msg_tx.take();
                }
                Ok(IncomingMsg::Cancel) => {
                    cancelled_tx.send_replace(true);
                }
                Err(e) => {
                    error!("Failed to parse gRPC message: {:?}", e);
                }
            }
        }
    };
    let event_handler =
        app_handle.listen_any(format!("grpc_client_msg_{}", conn.id).as_str(), event_cb);

    let grpc_listen = {
        let window = window.clone();
        let app_handle = app_handle.clone();
        let base_event = base_msg.clone();
        let environment_chain = environment_chain.clone();
        let req = request.clone();
        let msg = if req.message.is_empty() { "{}".to_string() } else { req.message };
        let msg = render_template(
            msg.as_str(),
            environment_chain,
            &template_cb,
            &RenderOptions { error_behavior: RenderErrorBehavior::Throw },
        )
        .await?;
        let msg = strip_json_comments(&msg);

        app_handle.db().upsert_grpc_event(
            &GrpcEvent {
                content: format!("Connecting to {}", req.url),
                event_type: GrpcEventType::ConnectionStart,
                metadata: metadata.clone(),
                ..base_event.clone()
            },
            &UpdateSource::from_window_label(window.label()),
        )?;

        async move {
            // Create callback for streaming methods that handles both success and error
            let on_message = {
                let app_handle = app_handle.clone();
                let base_event = base_event.clone();
                let window_label = window.label().to_string();
                move |result: std::result::Result<String, String>| match result {
                    Ok(msg) => {
                        let _ = app_handle.db().upsert_grpc_event(
                            &GrpcEvent {
                                content: msg,
                                event_type: GrpcEventType::ClientMessage,
                                ..base_event.clone()
                            },
                            &UpdateSource::from_window_label(&window_label),
                        );
                    }
                    Err(error) => {
                        let _ = app_handle.db().upsert_grpc_event(
                            &GrpcEvent {
                                content: format!("Failed to send message: {}", error),
                                event_type: GrpcEventType::Error,
                                ..base_event.clone()
                            },
                            &UpdateSource::from_window_label(&window_label),
                        );
                    }
                }
            };

            let (maybe_stream, maybe_msg) =
                match (method_desc.is_client_streaming(), method_desc.is_server_streaming()) {
                    (true, true) => (
                        Some(
                            connection
                                .streaming(
                                    &service,
                                    &method,
                                    in_msg_stream,
                                    &metadata,
                                    client_cert,
                                    on_message.clone(),
                                )
                                .await,
                        ),
                        None,
                    ),
                    (true, false) => (
                        None,
                        Some(
                            connection
                                .client_streaming(
                                    &service,
                                    &method,
                                    in_msg_stream,
                                    &metadata,
                                    client_cert,
                                    on_message.clone(),
                                )
                                .await,
                        ),
                    ),
                    (false, true) => (
                        Some(connection.server_streaming(&service, &method, &msg, &metadata).await),
                        None,
                    ),
                    (false, false) => (
                        None,
                        Some(
                            connection.unary(&service, &method, &msg, &metadata, client_cert).await,
                        ),
                    ),
                };

            if !method_desc.is_client_streaming() {
                app_handle
                    .db()
                    .upsert_grpc_event(
                        &GrpcEvent {
                            event_type: GrpcEventType::ClientMessage,
                            content: msg,
                            ..base_event.clone()
                        },
                        &UpdateSource::from_window_label(window.label()),
                    )
                    .unwrap();
            }

            match maybe_msg {
                Some(Ok(msg)) => {
                    app_handle
                        .db()
                        .upsert_grpc_event(
                            &GrpcEvent {
                                metadata: metadata_to_map(msg.metadata().clone()),
                                content: if msg.metadata().len() == 0 {
                                    "Received response"
                                } else {
                                    "Received response with metadata"
                                }
                                .to_string(),
                                event_type: GrpcEventType::Info,
                                ..base_event.clone()
                            },
                            &UpdateSource::from_window_label(window.label()),
                        )
                        .unwrap();
                    app_handle
                        .db()
                        .upsert_grpc_event(
                            &GrpcEvent {
                                content: serialize_message(&msg.into_inner()).unwrap(),
                                event_type: GrpcEventType::ServerMessage,
                                ..base_event.clone()
                            },
                            &UpdateSource::from_window_label(window.label()),
                        )
                        .unwrap();
                    app_handle
                        .db()
                        .upsert_grpc_event(
                            &GrpcEvent {
                                content: "Connection complete".to_string(),
                                event_type: GrpcEventType::ConnectionEnd,
                                status: Some(Code::Ok as i32),
                                ..base_event.clone()
                            },
                            &UpdateSource::from_window_label(window.label()),
                        )
                        .unwrap();
                }
                Some(Err(yakumo_grpc::error::Error::GrpcStreamError(e))) => {
                    app_handle
                        .db()
                        .upsert_grpc_event(
                            &(match e.status {
                                Some(s) => GrpcEvent {
                                    error: Some(s.message().to_string()),
                                    status: Some(s.code() as i32),
                                    content: "Failed to connect".to_string(),
                                    metadata: metadata_to_map(s.metadata().clone()),
                                    event_type: GrpcEventType::ConnectionEnd,
                                    ..base_event.clone()
                                },
                                None => GrpcEvent {
                                    error: Some(e.message),
                                    status: Some(Code::Unknown as i32),
                                    content: "Failed to connect".to_string(),
                                    event_type: GrpcEventType::ConnectionEnd,
                                    ..base_event.clone()
                                },
                            }),
                            &UpdateSource::from_window_label(window.label()),
                        )
                        .unwrap();
                }
                Some(Err(e)) => {
                    app_handle
                        .db()
                        .upsert_grpc_event(
                            &GrpcEvent {
                                error: Some(e.to_string()),
                                status: Some(Code::Unknown as i32),
                                content: "Failed to connect".to_string(),
                                event_type: GrpcEventType::ConnectionEnd,
                                ..base_event.clone()
                            },
                            &UpdateSource::from_window_label(window.label()),
                        )
                        .unwrap();
                }
                None => {
                    // Server streaming doesn't return the initial message
                }
            }

            let mut stream = match maybe_stream {
                Some(Ok(stream)) => {
                    app_handle
                        .db()
                        .upsert_grpc_event(
                            &GrpcEvent {
                                metadata: metadata_to_map(stream.metadata().clone()),
                                content: if stream.metadata().len() == 0 {
                                    "Received response"
                                } else {
                                    "Received response with metadata"
                                }
                                .to_string(),
                                event_type: GrpcEventType::Info,
                                ..base_event.clone()
                            },
                            &UpdateSource::from_window_label(window.label()),
                        )
                        .unwrap();
                    stream.into_inner()
                }
                Some(Err(yakumo_grpc::error::Error::GrpcStreamError(e))) => {
                    warn!("GRPC stream error {e:?}");
                    app_handle
                        .db()
                        .upsert_grpc_event(
                            &(match e.status {
                                Some(s) => GrpcEvent {
                                    error: Some(s.message().to_string()),
                                    status: Some(s.code() as i32),
                                    content: "Failed to connect".to_string(),
                                    metadata: metadata_to_map(s.metadata().clone()),
                                    event_type: GrpcEventType::ConnectionEnd,
                                    ..base_event.clone()
                                },
                                None => GrpcEvent {
                                    error: Some(e.message),
                                    status: Some(Code::Unknown as i32),
                                    content: "Failed to connect".to_string(),
                                    event_type: GrpcEventType::ConnectionEnd,
                                    ..base_event.clone()
                                },
                            }),
                            &UpdateSource::from_window_label(window.label()),
                        )
                        .unwrap();
                    return;
                }
                Some(Err(e)) => {
                    app_handle
                        .db()
                        .upsert_grpc_event(
                            &GrpcEvent {
                                error: Some(e.to_string()),
                                status: Some(Code::Unknown as i32),
                                content: "Failed to connect".to_string(),
                                event_type: GrpcEventType::ConnectionEnd,
                                ..base_event.clone()
                            },
                            &UpdateSource::from_window_label(window.label()),
                        )
                        .unwrap();
                    return;
                }
                None => return,
            };

            loop {
                match stream.message().await {
                    Ok(Some(msg)) => {
                        let message = serialize_message(&msg).unwrap();
                        app_handle
                            .db()
                            .upsert_grpc_event(
                                &GrpcEvent {
                                    content: message,
                                    event_type: GrpcEventType::ServerMessage,
                                    ..base_event.clone()
                                },
                                &UpdateSource::from_window_label(window.label()),
                            )
                            .unwrap();
                    }
                    Ok(None) => {
                        let trailers =
                            stream.trailers().await.unwrap_or_default().unwrap_or_default();
                        app_handle
                            .db()
                            .upsert_grpc_event(
                                &GrpcEvent {
                                    content: "Connection complete".to_string(),
                                    status: Some(Code::Ok as i32),
                                    metadata: metadata_to_map(trailers),
                                    event_type: GrpcEventType::ConnectionEnd,
                                    ..base_event.clone()
                                },
                                &UpdateSource::from_window_label(window.label()),
                            )
                            .unwrap();
                        break;
                    }
                    Err(status) => {
                        app_handle
                            .db()
                            .upsert_grpc_event(
                                &GrpcEvent {
                                    content: status.to_string(),
                                    status: Some(status.code() as i32),
                                    metadata: metadata_to_map(status.metadata().clone()),
                                    event_type: GrpcEventType::ConnectionEnd,
                                    ..base_event.clone()
                                },
                                &UpdateSource::from_window_label(window.label()),
                            )
                            .unwrap();
                    }
                }
            }
        }
    };

    {
        let conn_id = conn_id.clone();
        tauri::async_runtime::spawn(async move {
            let w = app_handle.clone();
            tokio::select! {
                _ = grpc_listen => {
                    let events = w.db().list_grpc_events(&conn_id).unwrap();
                    let closed_event = events
                        .iter()
                        .find(|e| GrpcEventType::ConnectionEnd == e.event_type);
                    let closed_status = closed_event.and_then(|e| e.status).unwrap_or(Code::Unavailable as i32);
                    w.with_tx(|c| {
                        c.upsert_grpc_connection(
                            &GrpcConnection{
                                elapsed: start.elapsed().as_millis() as i32,
                                status: closed_status,
                                state: GrpcConnectionState::Closed,
                                ..c.get_grpc_connection( &conn_id).unwrap().clone()
                            },
                            &UpdateSource::from_window_label(window.label()),
                        )
                    }).unwrap();
                },
                _ = cancelled_rx.changed() => {
                    w.db().upsert_grpc_event(
                        &GrpcEvent {
                            content: "Cancelled".to_string(),
                            event_type: GrpcEventType::ConnectionEnd,
                            status: Some(Code::Cancelled as i32),
                            ..base_msg.clone()
                        },
                        &UpdateSource::from_window_label(window.label()),
                    ).unwrap();
                    w.with_tx(|c| {
                        c.upsert_grpc_connection(
                            &GrpcConnection{
                            elapsed: start.elapsed().as_millis() as i32,
                            status: Code::Cancelled as i32,
                            state: GrpcConnectionState::Closed,
                                ..c.get_grpc_connection( &conn_id).unwrap().clone()
                            },
                            &UpdateSource::from_window_label(window.label()),
                        )
                    }).unwrap();
                },
            }
            w.unlisten(event_handler);
        });
    };

    Ok(conn.id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default().plugin(
        Builder::default()
            .targets([
                Target::new(TargetKind::Stdout),
                Target::new(TargetKind::LogDir { file_name: None }),
                Target::new(TargetKind::Webview),
            ])
            .level_for("plugin_runtime", log::LevelFilter::Info)
            .level_for("cookie_store", log::LevelFilter::Info)
            .level_for("eventsource_client::event_parser", log::LevelFilter::Info)
            .level_for("h2", log::LevelFilter::Info)
            .level_for("hyper", log::LevelFilter::Info)
            .level_for("hyper_util", log::LevelFilter::Info)
            .level_for("hyper_rustls", log::LevelFilter::Info)
            .level_for("reqwest", log::LevelFilter::Info)
            .level_for("sqlx", log::LevelFilter::Debug)
            .level_for("tao", log::LevelFilter::Info)
            .level_for("tokio_util", log::LevelFilter::Info)
            .level_for("tonic", log::LevelFilter::Info)
            .level_for("tower", log::LevelFilter::Info)
            .level_for("tracing", log::LevelFilter::Warn)
            .level_for("swc_ecma_codegen", log::LevelFilter::Off)
            .level_for("swc_ecma_transforms_base", log::LevelFilter::Off)
            .with_colors(ColoredLevelConfig::default())
            .level(if is_dev() { log::LevelFilter::Debug } else { log::LevelFilter::Info })
            .build(),
    );

    // Only enable single-instance in production builds. In dev mode, we want to allow
    // multiple instances for testing and worktree workflows (running multiple branches).
    if !is_dev() {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // When trying to open a new app instance (common operation on Linux),
            // focus the first existing window we find instead of opening a new one
            // TODO: Keep track of the last focused window and always focus that one
            if let Some(window) = app.webview_windows().values().next() {
                let _ = window.set_focus();
            }
        }));
    }

    builder = builder
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        // Don't restore StateFlags::DECORATIONS because we want to be able to toggle them on/off on a restart
        // We could* make this work if we toggled them in the frontend before the window closes, but, this is nicer.
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(StateFlags::all() - StateFlags::DECORATIONS)
                .build(),
        )
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(yakumo_mac_window::init())
        .plugin(models_ext::init()) // Database setup only
        .plugin(yakumo_fonts::init());

    #[cfg(feature = "license")]
    {
        builder = builder.plugin(yakumo_license::init());
    }

    #[cfg(feature = "updater")]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::default().build());
    }

    builder
        .setup(|app| {
            // Initialize HTTP connection manager
            app.manage(yakumo_http::manager::HttpConnectionManager::new());

            // Initialize encryption manager
            let query_manager =
                app.state::<yakumo_models::query_manager::QueryManager>().inner().clone();
            let app_id = app.config().identifier.to_string();
            app.manage(yakumo_crypto::manager::EncryptionManager::new(query_manager, app_id));

            {
                let app_handle = app.app_handle().clone();
                app.deep_link().on_open_url(move |event| {
                    info!("Handling deep link open");
                    let app_handle = app_handle.clone();
                    tauri::async_runtime::spawn(async move {
                        for url in event.urls() {
                            if let Err(e) = handle_deep_link(&app_handle, &url).await {
                                warn!("Failed to handle deep link {}: {e:?}", url.to_string());
                                let _ = app_handle.emit(
                                    "show_toast",
                                    ShowToastRequest {
                                        message: format!(
                                            "Error handling deep link: {}",
                                            e.to_string()
                                        ),
                                        color: Some(Color::Danger),
                                        icon: None,
                                        timeout: None,
                                    },
                                );
                            };
                        }
                    });
                });
            };

            // Add updater
            let yakumo_updater = YakumoUpdater::new();
            app.manage(Mutex::new(yakumo_updater));

            // Add notifier
            let yakumo_notifier = YakumoNotifier::new();
            app.manage(Mutex::new(yakumo_notifier));

            // Add GRPC manager
            let grpc_handle = GrpcHandle::new();
            app.manage(Mutex::new(grpc_handle));

            // Add WebSocket manager
            let ws_manager = yakumo_ws::WebsocketManager::new();
            app.manage(Mutex::new(ws_manager));

            // Specific settings
            let settings = app.db().get_settings();
            app.app_handle().set_native_titlebar(settings.use_native_titlebar);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            update_commands::cmd_check_for_updates,
            history::cmd_delete_all_grpc_connections,
            history::cmd_delete_all_http_responses,
            history::cmd_delete_send_history,
            notifications::cmd_dismiss_notification,
            file_commands::cmd_export_data,
            http_request::cmd_http_request_body,
            file_commands::cmd_http_response_body_bytes,
            file_commands::cmd_directory_is_empty,
            formatting::cmd_format_json,
            formatting::cmd_format_graphql,
            formatting::cmd_format_xml,
            formatting::cmd_format_html,
            file_commands::cmd_get_sse_events,
            file_commands::cmd_get_http_response_events,
            models_ext::models_get_workspace_meta,
            cmd_grpc_go,
            cmd_grpc_reflect,
            file_commands::cmd_import_data,
            metadata_commands::cmd_metadata,
            window_commands::cmd_new_child_window,
            window_commands::cmd_new_main_window,
            template_commands::cmd_render_template,
            window_commands::cmd_restart,
            file_commands::cmd_save_response,
            http_request::cmd_send_ephemeral_request,
            http_request::cmd_send_http_request,
            template_commands::cmd_template_tokens_to_string,
            //
            //
            // Migrated commands
            crate::commands::cmd_decrypt_template,
            crate::commands::cmd_default_headers,
            crate::commands::cmd_disable_encryption,
            crate::commands::cmd_enable_encryption,
            crate::commands::cmd_get_http_authentication_summaries,
            crate::commands::cmd_get_http_authentication_config,
            crate::commands::cmd_get_themes,
            crate::commands::cmd_call_folder_action,
            crate::commands::cmd_call_grpc_request_action,
            crate::commands::cmd_call_http_request_action,
            crate::commands::cmd_call_websocket_request_action,
            crate::commands::cmd_call_workspace_action,
            crate::commands::cmd_curl_to_request,
            crate::commands::cmd_folder_actions,
            crate::commands::cmd_grpc_request_actions,
            crate::commands::cmd_http_request_actions,
            crate::commands::cmd_http_response_body,
            crate::commands::cmd_reveal_workspace_key,
            crate::commands::cmd_secure_template,
            crate::commands::cmd_set_workspace_key,
            crate::commands::cmd_template_function_config,
            crate::commands::cmd_template_function_summaries,
            crate::commands::cmd_websocket_request_actions,
            crate::commands::cmd_workspace_actions,
            //
            // Models commands
            models_ext::models_delete,
            models_ext::models_duplicate,
            models_ext::models_get_graphql_introspection,
            models_ext::models_get_settings,
            models_ext::models_grpc_events,
            models_ext::models_upsert,
            models_ext::models_upsert_graphql_introspection,
            models_ext::models_websocket_events,
            models_ext::models_workspace_models,
            //
            // Sync commands
            sync_ext::cmd_sync_calculate,
            sync_ext::cmd_sync_calculate_fs,
            sync_ext::cmd_sync_apply,
            sync_ext::cmd_sync_apply_fs,
            sync_ext::cmd_sync_watch,
            //
            // Git commands
            git_ext::cmd_git_workspace_checkout,
            git_ext::cmd_git_workspace_branch,
            git_ext::cmd_git_workspace_delete_branch,
            git_ext::cmd_git_workspace_delete_remote_branch,
            git_ext::cmd_git_workspace_merge_branch,
            git_ext::cmd_git_workspace_rename_branch,
            git_ext::cmd_git_workspace_status,
            git_ext::cmd_git_workspace_log,
            git_ext::cmd_git_workspace_initialize,
            git_ext::cmd_git_clone,
            git_ext::cmd_git_workspace_commit,
            git_ext::cmd_git_workspace_fetch_all,
            git_ext::cmd_git_workspace_push,
            git_ext::cmd_git_workspace_pull,
            git_ext::cmd_git_workspace_pull_force_reset,
            git_ext::cmd_git_workspace_pull_merge,
            git_ext::cmd_git_workspace_add,
            git_ext::cmd_git_workspace_unstage,
            git_ext::cmd_git_workspace_reset_changes,
            git_ext::cmd_git_add_credential,
            git_ext::cmd_git_workspace_remotes,
            git_ext::cmd_git_workspace_add_remote,
            git_ext::cmd_git_workspace_rm_remote,
            //
            // WebSocket commands
            ws_ext::cmd_ws_delete_connections,
            ws_ext::cmd_ws_send,
            ws_ext::cmd_ws_close,
            ws_ext::cmd_ws_connect,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            match event {
                RunEvent::Ready => {
                    let _ = window::create_main_window(app_handle, "/");
                    let h = app_handle.clone();
                    tauri::async_runtime::spawn(async move {
                        let info = history::get_or_upsert_launch_info(&h);
                        debug!("Launched Yakumo {:?}", info);
                    });

                    // Cancel pending requests
                    let h = app_handle.clone();
                    tauri::async_runtime::block_on(async move {
                        let db = h.db();
                        let _ = db.cancel_pending_http_responses();
                        let _ = db.cancel_pending_grpc_connections();
                        let _ = db.cancel_pending_websocket_connections();
                    });
                }
                RunEvent::WindowEvent { event: WindowEvent::Focused(true), label, .. } => {
                    if cfg!(feature = "updater") {
                        // Run update check whenever the window is focused
                        let w = app_handle.get_webview_window(&label).unwrap();
                        let h = app_handle.clone();
                        tauri::async_runtime::spawn(async move {
                            let settings = w.db().get_settings();
                            if settings.autoupdate {
                                time::sleep(Duration::from_secs(3)).await; // Wait a bit so it's not so jarring
                                let val: State<'_, Mutex<YakumoUpdater>> = h.state();
                                let update_mode =
                                    update_commands::get_update_mode(&w).await.unwrap();
                                if let Err(e) = val
                                    .lock()
                                    .await
                                    .maybe_check(&w, settings.auto_download_updates, update_mode)
                                    .await
                                {
                                    warn!("Failed to check for updates {e:?}");
                                }
                            };
                        });
                    }

                    let h = app_handle.clone();
                    tauri::async_runtime::spawn(async move {
                        let windows = h.webview_windows();
                        let w = windows.values().next().unwrap();
                        tokio::time::sleep(Duration::from_millis(4000)).await;
                        let val: State<'_, Mutex<YakumoNotifier>> = w.state();
                        let mut n = val.lock().await;
                        if let Err(e) = n.maybe_check(&w).await {
                            warn!("Failed to check for notifications {}", e)
                        }
                    });
                }
                RunEvent::WindowEvent { event: WindowEvent::CloseRequested { .. }, .. } => {
                    if let Err(e) = app_handle.save_window_state(StateFlags::all()) {
                        warn!("Failed to save window state {e:?}");
                    } else {
                        info!("Saved window state");
                    };
                }
                _ => {}
            };
        });
}

fn safe_uri(endpoint: &str) -> String {
    if endpoint.starts_with("http://") || endpoint.starts_with("https://") {
        endpoint.into()
    } else {
        format!("http://{}", endpoint)
    }
}
