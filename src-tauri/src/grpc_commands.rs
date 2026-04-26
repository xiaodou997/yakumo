use crate::BuiltinTemplateCallback;
use crate::error::Error::GenericError;
use crate::error::Result as YakumoResult;
use crate::grpc::{build_metadata, metadata_to_map, resolve_grpc_request};
use crate::models_ext::QueryManagerExt;
use crate::render::{render_grpc_request, render_template};
use crate::safe_uri;
use log::{error, warn};
use std::path::PathBuf;
use tauri::{AppHandle, Listener, Manager, Runtime, State, WebviewWindow};
use tokio::sync::Mutex;
use tokio::task::block_in_place;
use yakumo_crypto::manager::EncryptionManager;
use yakumo_grpc::manager::GrpcHandle;
use yakumo_grpc::{Code, ServiceDefinition, serialize_message};
use yakumo_models::models::{GrpcConnection, GrpcConnectionState, GrpcEvent, GrpcEventType};
use yakumo_models::util::UpdateSource;
use yakumo_templates::strip_json_comments::strip_json_comments;
use yakumo_templates::{RenderErrorBehavior, RenderOptions};
use yakumo_tls::find_client_certificate;

fn write_grpc_event<R: Runtime>(app_handle: &AppHandle<R>, event: &GrpcEvent, window_label: &str) {
    if let Err(err) =
        app_handle.db().upsert_grpc_event(event, &UpdateSource::from_window_label(window_label))
    {
        warn!("Failed to persist gRPC event for {}: {err}", event.connection_id);
    }
}

fn selected_grpc_method(
    request: &yakumo_models::models::GrpcRequest,
) -> YakumoResult<(String, String)> {
    match (request.service.clone(), request.method.clone()) {
        (Some(service), Some(method))
            if !service.trim().is_empty() && !method.trim().is_empty() =>
        {
            Ok((service, method))
        }
        _ => Err(GenericError("Service and method are required".to_string())),
    }
}

#[tauri::command]
pub(crate) async fn cmd_grpc_reflect<R: Runtime>(
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
    let proto_files: Vec<PathBuf> = proto_files.iter().map(PathBuf::from).collect();

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
pub(crate) async fn cmd_grpc_go<R: Runtime>(
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
    let settings = app_handle.db().get_settings();
    let client_cert = find_client_certificate(&request.url, &settings.client_certificates);
    let (service, method) = selected_grpc_method(&request)?;

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
        workspace_id: request.workspace_id.clone(),
        request_id: request.id.clone(),
        connection_id: conn.id.clone(),
        ..Default::default()
    };

    let (in_msg_tx, in_msg_rx) = tauri::async_runtime::channel::<String>(16);
    let maybe_in_msg_tx = std::sync::Mutex::new(Some(in_msg_tx.clone()));
    let (cancelled_tx, mut cancelled_rx) = tokio::sync::watch::channel(false);

    let uri = safe_uri(&request.url);
    let in_msg_stream = tokio_stream::wrappers::ReceiverStream::new(in_msg_rx);
    let proto_files: Vec<PathBuf> = proto_files.iter().map(PathBuf::from).collect();

    let start = std::time::Instant::now();
    let connection = grpc_handle
        .lock()
        .await
        .connect(
            &request.id,
            uri.as_str(),
            &proto_files,
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
        let connection_id = conn.id.clone();

        move |ev: tauri::Event| {
            if *cancelled_rx.borrow() {
                return;
            }

            let mut maybe_in_msg_tx = match maybe_in_msg_tx.lock() {
                Ok(guard) => guard,
                Err(err) => {
                    error!("gRPC input channel mutex poisoned for {connection_id}: {err}");
                    err.into_inner()
                }
            };
            let Some(in_msg_tx) = maybe_in_msg_tx.as_ref() else {
                return;
            };

            match serde_json::from_str::<IncomingMsg>(ev.payload()) {
                Ok(IncomingMsg::Message(msg)) => {
                    let environment_chain = environment_chain.clone();
                    let rendered = block_in_place(|| {
                        tauri::async_runtime::block_on(async {
                            render_template(
                                msg.as_str(),
                                environment_chain,
                                &template_cb,
                                &RenderOptions { error_behavior: RenderErrorBehavior::Throw },
                            )
                            .await
                        })
                    });

                    let msg = match rendered {
                        Ok(msg) => strip_json_comments(&msg),
                        Err(err) => {
                            error!(
                                "Failed to render gRPC client message for {connection_id}: {err}"
                            );
                            return;
                        }
                    };

                    if let Err(err) = in_msg_tx.try_send(msg) {
                        warn!("Failed to enqueue gRPC client message for {connection_id}: {err}");
                    }
                }
                Ok(IncomingMsg::Commit) => {
                    maybe_in_msg_tx.take();
                }
                Ok(IncomingMsg::Cancel) => {
                    cancelled_tx.send_replace(true);
                }
                Err(err) => {
                    error!("Failed to parse gRPC message for {connection_id}: {err}");
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
        let window_label = window.label().to_string();
        let msg = if req.message.is_empty() { "{}".to_string() } else { req.message.clone() };
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
            let on_message = {
                let app_handle = app_handle.clone();
                let base_event = base_event.clone();
                let window_label = window_label.clone();
                move |result: std::result::Result<String, String>| match result {
                    Ok(msg) => write_grpc_event(
                        &app_handle,
                        &GrpcEvent {
                            content: msg,
                            event_type: GrpcEventType::ClientMessage,
                            ..base_event.clone()
                        },
                        &window_label,
                    ),
                    Err(error) => write_grpc_event(
                        &app_handle,
                        &GrpcEvent {
                            content: format!("Failed to send message: {error}"),
                            event_type: GrpcEventType::Error,
                            ..base_event.clone()
                        },
                        &window_label,
                    ),
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
                write_grpc_event(
                    &app_handle,
                    &GrpcEvent {
                        event_type: GrpcEventType::ClientMessage,
                        content: msg.clone(),
                        ..base_event.clone()
                    },
                    &window_label,
                );
            }

            match maybe_msg {
                Some(Ok(msg)) => {
                    write_grpc_event(
                        &app_handle,
                        &GrpcEvent {
                            metadata: metadata_to_map(msg.metadata().clone()),
                            content: if msg.metadata().is_empty() {
                                "Received response"
                            } else {
                                "Received response with metadata"
                            }
                            .to_string(),
                            event_type: GrpcEventType::Info,
                            ..base_event.clone()
                        },
                        &window_label,
                    );

                    match serialize_message(&msg.into_inner()) {
                        Ok(content) => write_grpc_event(
                            &app_handle,
                            &GrpcEvent {
                                content,
                                event_type: GrpcEventType::ServerMessage,
                                ..base_event.clone()
                            },
                            &window_label,
                        ),
                        Err(err) => write_grpc_event(
                            &app_handle,
                            &GrpcEvent {
                                error: Some(err.to_string()),
                                content: "Failed to serialize response".to_string(),
                                event_type: GrpcEventType::Error,
                                ..base_event.clone()
                            },
                            &window_label,
                        ),
                    }

                    write_grpc_event(
                        &app_handle,
                        &GrpcEvent {
                            content: "Connection complete".to_string(),
                            event_type: GrpcEventType::ConnectionEnd,
                            status: Some(Code::Ok as i32),
                            ..base_event.clone()
                        },
                        &window_label,
                    );
                }
                Some(Err(yakumo_grpc::error::Error::GrpcStreamError(e))) => {
                    write_grpc_event(
                        &app_handle,
                        &(match e.status {
                            Some(status) => GrpcEvent {
                                error: Some(status.message().to_string()),
                                status: Some(status.code() as i32),
                                content: "Failed to connect".to_string(),
                                metadata: metadata_to_map(status.metadata().clone()),
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
                        &window_label,
                    );
                }
                Some(Err(err)) => {
                    write_grpc_event(
                        &app_handle,
                        &GrpcEvent {
                            error: Some(err.to_string()),
                            status: Some(Code::Unknown as i32),
                            content: "Failed to connect".to_string(),
                            event_type: GrpcEventType::ConnectionEnd,
                            ..base_event.clone()
                        },
                        &window_label,
                    );
                }
                None => {}
            }

            let mut stream = match maybe_stream {
                Some(Ok(stream)) => {
                    write_grpc_event(
                        &app_handle,
                        &GrpcEvent {
                            metadata: metadata_to_map(stream.metadata().clone()),
                            content: if stream.metadata().is_empty() {
                                "Received response"
                            } else {
                                "Received response with metadata"
                            }
                            .to_string(),
                            event_type: GrpcEventType::Info,
                            ..base_event.clone()
                        },
                        &window_label,
                    );
                    stream.into_inner()
                }
                Some(Err(yakumo_grpc::error::Error::GrpcStreamError(e))) => {
                    write_grpc_event(
                        &app_handle,
                        &(match e.status {
                            Some(status) => GrpcEvent {
                                error: Some(status.message().to_string()),
                                status: Some(status.code() as i32),
                                content: "Failed to connect".to_string(),
                                metadata: metadata_to_map(status.metadata().clone()),
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
                        &window_label,
                    );
                    return;
                }
                Some(Err(err)) => {
                    write_grpc_event(
                        &app_handle,
                        &GrpcEvent {
                            error: Some(err.to_string()),
                            status: Some(Code::Unknown as i32),
                            content: "Failed to connect".to_string(),
                            event_type: GrpcEventType::ConnectionEnd,
                            ..base_event.clone()
                        },
                        &window_label,
                    );
                    return;
                }
                None => return,
            };

            loop {
                match stream.message().await {
                    Ok(Some(msg)) => match serialize_message(&msg) {
                        Ok(message) => write_grpc_event(
                            &app_handle,
                            &GrpcEvent {
                                content: message,
                                event_type: GrpcEventType::ServerMessage,
                                ..base_event.clone()
                            },
                            &window_label,
                        ),
                        Err(err) => write_grpc_event(
                            &app_handle,
                            &GrpcEvent {
                                error: Some(err.to_string()),
                                content: "Failed to serialize response".to_string(),
                                event_type: GrpcEventType::Error,
                                ..base_event.clone()
                            },
                            &window_label,
                        ),
                    },
                    Ok(None) => {
                        let trailers = match stream.trailers().await {
                            Ok(Some(trailers)) => trailers,
                            Ok(None) => Default::default(),
                            Err(err) => {
                                warn!(
                                    "Failed to read gRPC trailers for {}: {err}",
                                    base_event.connection_id
                                );
                                Default::default()
                            }
                        };
                        write_grpc_event(
                            &app_handle,
                            &GrpcEvent {
                                content: "Connection complete".to_string(),
                                status: Some(Code::Ok as i32),
                                metadata: metadata_to_map(trailers),
                                event_type: GrpcEventType::ConnectionEnd,
                                ..base_event.clone()
                            },
                            &window_label,
                        );
                        break;
                    }
                    Err(status) => {
                        write_grpc_event(
                            &app_handle,
                            &GrpcEvent {
                                content: status.to_string(),
                                status: Some(status.code() as i32),
                                metadata: metadata_to_map(status.metadata().clone()),
                                event_type: GrpcEventType::ConnectionEnd,
                                ..base_event.clone()
                            },
                            &window_label,
                        );
                    }
                }
            }
        }
    };

    {
        let conn_id = conn_id.clone();
        let window_label = window.label().to_string();
        let app_handle = app_handle.clone();
        tauri::async_runtime::spawn(async move {
            tokio::select! {
                _ = grpc_listen => {
                    match app_handle.db().list_grpc_events(&conn_id) {
                        Ok(events) => {
                            let closed_status = events
                                .iter()
                                .find(|e| GrpcEventType::ConnectionEnd == e.event_type)
                                .and_then(|e| e.status)
                                .unwrap_or(Code::Unavailable as i32);

                            let result = app_handle.with_tx(|tx| {
                                let existing = tx.get_grpc_connection(&conn_id)?;
                                tx.upsert_grpc_connection(
                                    &GrpcConnection {
                                        elapsed: start.elapsed().as_millis() as i32,
                                        status: closed_status,
                                        state: GrpcConnectionState::Closed,
                                        ..existing
                                    },
                                    &UpdateSource::from_window_label(&window_label),
                                )
                            });
                            if let Err(err) = result {
                                warn!("Failed to finalize gRPC connection {conn_id}: {err}");
                            }
                        }
                        Err(err) => warn!("Failed to load gRPC events for {conn_id}: {err}"),
                    }
                },
                _ = cancelled_rx.changed() => {
                    write_grpc_event(
                        &app_handle,
                        &GrpcEvent {
                            content: "Cancelled".to_string(),
                            event_type: GrpcEventType::ConnectionEnd,
                            status: Some(Code::Cancelled as i32),
                            ..base_msg.clone()
                        },
                        &window_label,
                    );

                    let result = app_handle.with_tx(|tx| {
                        let existing = tx.get_grpc_connection(&conn_id)?;
                        tx.upsert_grpc_connection(
                            &GrpcConnection {
                                elapsed: start.elapsed().as_millis() as i32,
                                status: Code::Cancelled as i32,
                                state: GrpcConnectionState::Closed,
                                ..existing
                            },
                            &UpdateSource::from_window_label(&window_label),
                        )
                    });
                    if let Err(err) = result {
                        warn!("Failed to mark cancelled gRPC connection {conn_id}: {err}");
                    }
                },
            }
            app_handle.unlisten(event_handler);
        });
    };

    Ok(conn.id)
}

#[cfg(test)]
mod tests {
    use super::selected_grpc_method;
    use yakumo_models::models::GrpcRequest;

    #[test]
    fn selected_grpc_method_requires_service_and_method_before_connection_is_created() {
        let request = GrpcRequest {
            service: Some("example.UserService".to_string()),
            method: Some("GetUser".to_string()),
            ..Default::default()
        };
        assert_eq!(
            selected_grpc_method(&request).expect("method selection should be valid"),
            ("example.UserService".to_string(), "GetUser".to_string())
        );

        let missing_method =
            GrpcRequest { service: Some("example.UserService".to_string()), ..Default::default() };
        assert!(selected_grpc_method(&missing_method).is_err());

        let empty_service = GrpcRequest {
            service: Some(" ".to_string()),
            method: Some("GetUser".to_string()),
            ..Default::default()
        };
        assert!(selected_grpc_method(&empty_service).is_err());
    }
}
