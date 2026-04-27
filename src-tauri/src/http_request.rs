use crate::BuiltinTemplateCallback;
use crate::error::Error::GenericError;
use crate::error::Result;
use crate::models_ext::BlobManagerExt;
use crate::models_ext::QueryManagerExt;
use log::warn;
use std::time::Instant;
use tauri::{AppHandle, Listener, Manager, Runtime, WebviewWindow};
use tokio::io::AsyncReadExt;
use tokio::sync::mpsc;
use tokio::sync::watch::Receiver;
use yakumo_crypto::manager::EncryptionManager;
use yakumo_http::client::{
    HttpConnectionOptions, HttpConnectionProxySetting, HttpConnectionProxySettingAuth,
};
use yakumo_http::cookies::CookieStore;
use yakumo_http::sender::{HttpResponseEvent as SenderHttpResponseEvent, ReqwestSender};
use yakumo_http::transaction::HttpTransaction;
use yakumo_http::types::SendableHttpRequestOptions;
use yakumo_models::blob_manager::BodyChunk;
use yakumo_models::models::{
    CookieJar, Environment, HttpRequest, HttpResponse, HttpResponseEvent, HttpResponseState,
    ProxySetting,
};
use yakumo_models::util::UpdateSource;
use yakumo_templates::{RenderErrorBehavior, RenderOptions};
use yakumo_tls::find_client_certificate;

#[tauri::command]
pub(crate) async fn cmd_send_ephemeral_request<R: Runtime>(
    mut request: HttpRequest,
    environment_id: Option<&str>,
    cookie_jar_id: Option<&str>,
    window: WebviewWindow<R>,
    app_handle: AppHandle<R>,
) -> Result<HttpResponse> {
    let response = HttpResponse::default();
    request.id = "".to_string();
    let environment = match environment_id {
        Some(id) => Some(app_handle.db().get_environment(id)?),
        None => None,
    };
    let cookie_jar = match cookie_jar_id {
        Some(id) => Some(app_handle.db().get_cookie_jar(id)?),
        None => None,
    };

    let (cancel_tx, mut cancel_rx) = tokio::sync::watch::channel(false);
    window.listen_any(format!("cancel_http_response_{}", response.id), move |_event| {
        if let Err(e) = cancel_tx.send(true) {
            warn!("Failed to send cancel event for ephemeral request {e:?}");
        }
    });

    send_http_request(&window, &request, &response, environment, cookie_jar, &mut cancel_rx).await
}

#[tauri::command]
pub(crate) async fn cmd_http_request_body<R: Runtime>(
    app_handle: AppHandle<R>,
    response_id: &str,
) -> Result<Option<Vec<u8>>> {
    let body_id = format!("{}.request", response_id);
    let chunks = app_handle.blobs().get_chunks(&body_id)?;

    if chunks.is_empty() {
        return Ok(None);
    }

    Ok(Some(chunks.into_iter().flat_map(|c| c.data).collect()))
}

#[tauri::command]
pub(crate) async fn cmd_send_http_request<R: Runtime>(
    app_handle: AppHandle<R>,
    window: WebviewWindow<R>,
    environment_id: Option<&str>,
    cookie_jar_id: Option<&str>,
    // NOTE: We receive the entire request because to account for the race
    //   condition where the user may have just edited a field before sending
    //   that has not yet been saved in the DB.
    request: HttpRequest,
) -> Result<HttpResponse> {
    let blobs = app_handle.blob_manager();
    let response = app_handle.db().upsert_http_response(
        &HttpResponse {
            request_id: request.id.clone(),
            workspace_id: request.workspace_id.clone(),
            ..Default::default()
        },
        &UpdateSource::from_window_label(window.label()),
        &blobs,
    )?;

    let (cancel_tx, mut cancel_rx) = tokio::sync::watch::channel(false);
    app_handle.listen_any(format!("cancel_http_response_{}", response.id), move |_event| {
        if let Err(e) = cancel_tx.send(true) {
            warn!("Failed to send cancel event for request {e:?}");
        }
    });

    let environment = match environment_id {
        Some(id) => match app_handle.db().get_environment(id) {
            Ok(env) => Some(env),
            Err(e) => {
                warn!("Failed to find environment by id {id} {}", e);
                None
            }
        },
        None => None,
    };

    let cookie_jar = match cookie_jar_id {
        Some(id) => Some(app_handle.db().get_cookie_jar(id)?),
        None => None,
    };

    let r = match send_http_request(
        &window,
        &request,
        &response,
        environment,
        cookie_jar,
        &mut cancel_rx,
    )
    .await
    {
        Ok(r) => r,
        Err(e) => {
            let resp = app_handle.db().get_http_response(&response.id)?;
            app_handle.db().upsert_http_response(
                &HttpResponse {
                    state: HttpResponseState::Closed,
                    error: Some(e.to_string()),
                    ..resp
                },
                &UpdateSource::from_window_label(window.label()),
                &blobs,
            )?
        }
    };

    Ok(r)
}

/// Context for managing response state during HTTP transactions.
/// Handles both persisted responses (stored in DB) and ephemeral responses (in-memory only).
struct ResponseContext<R: Runtime> {
    app_handle: AppHandle<R>,
    response: HttpResponse,
    update_source: UpdateSource,
}

impl<R: Runtime> ResponseContext<R> {
    fn new(app_handle: AppHandle<R>, response: HttpResponse, update_source: UpdateSource) -> Self {
        Self { app_handle, response, update_source }
    }

    /// Whether this response is persisted (has a non-empty ID)
    fn is_persisted(&self) -> bool {
        !self.response.id.is_empty()
    }

    /// Update the response state. For persisted responses, fetches from DB, applies the
    /// closure, and updates the DB. For ephemeral responses, just applies the closure
    /// to the in-memory response.
    fn update<F>(&mut self, func: F) -> Result<()>
    where
        F: FnOnce(&mut HttpResponse),
    {
        if self.is_persisted() {
            let r = self.app_handle.with_tx(|tx| {
                let mut r = tx.get_http_response(&self.response.id)?;
                func(&mut r);
                tx.update_http_response_if_id(&r, &self.update_source)?;
                Ok(r)
            })?;
            self.response = r;
            Ok(())
        } else {
            func(&mut self.response);
            Ok(())
        }
    }

    /// Get the current response state
    fn response(&self) -> &HttpResponse {
        &self.response
    }
}

pub async fn send_http_request<R: Runtime>(
    window: &WebviewWindow<R>,
    unrendered_request: &HttpRequest,
    og_response: &HttpResponse,
    environment: Option<Environment>,
    cookie_jar: Option<CookieJar>,
    cancelled_rx: &mut Receiver<bool>,
) -> Result<HttpResponse> {
    send_http_request_inner(
        window,
        unrendered_request,
        og_response,
        environment,
        cookie_jar,
        cancelled_rx,
    )
    .await
}

async fn send_http_request_inner<R: Runtime>(
    window: &WebviewWindow<R>,
    unrendered_request: &HttpRequest,
    og_response: &HttpResponse,
    environment: Option<Environment>,
    cookie_jar: Option<CookieJar>,
    cancelled_rx: &Receiver<bool>,
) -> Result<HttpResponse> {
    let app_handle = window.app_handle().clone();
    let update_source = UpdateSource::from_window_label(window.label());
    let mut response_ctx =
        ResponseContext::new(app_handle.clone(), og_response.clone(), update_source.clone());

    let start = Instant::now();

    // Resolve environment chain for template rendering
    let environment_chain = if let Some(env) = &environment {
        app_handle.db().resolve_environments(
            &unrendered_request.workspace_id,
            unrendered_request.folder_id.as_deref(),
            Some(&env.id),
        )?
    } else {
        app_handle.db().resolve_environments(
            &unrendered_request.workspace_id,
            unrendered_request.folder_id.as_deref(),
            None,
        )?
    };

    // Render the request using template system
    let cb = BuiltinTemplateCallback::for_workspace(
        app_handle.state::<EncryptionManager>().inner().clone(),
        unrendered_request.workspace_id.clone(),
    );
    let rendered_request = yakumo::render::render_http_request(
        unrendered_request,
        environment_chain,
        &cb,
        &RenderOptions { error_behavior: RenderErrorBehavior::Throw },
    )
    .await?;

    // Build SendableHttpRequest
    let options = SendableHttpRequestOptions { follow_redirects: true, timeout: None };
    let sendable_request =
        yakumo_http::types::SendableHttpRequest::from_http_request(&rendered_request, options)
            .await
            .map_err(|e| GenericError(e.to_string()))?;

    let workspace = app_handle.db().get_workspace(&unrendered_request.workspace_id)?;
    let settings = app_handle.db().get_settings();
    let client_certificate =
        find_client_certificate(&sendable_request.url, &settings.client_certificates);
    let client_options = HttpConnectionOptions {
        id: unrendered_request.id.clone(),
        validate_certificates: workspace.setting_validate_certificates,
        proxy: http_proxy_setting(settings.proxy),
        client_certificate,
        dns_overrides: workspace.setting_dns_overrides.clone(),
    };
    let (client, _resolver) =
        client_options.build_client().map_err(|e| GenericError(e.to_string()))?;

    // Create HTTP sender and transaction
    let sender = ReqwestSender::with_client(client);

    // Create cookie store if we have a cookie jar
    let transaction = if let Some(jar) = &cookie_jar {
        let cookie_store = CookieStore::from_cookies(jar.cookies.clone());
        HttpTransaction::with_cookie_store(sender, cookie_store)
    } else {
        HttpTransaction::new(sender)
    };

    // Create event channel for HTTP events
    let (event_tx, mut event_rx) = mpsc::channel::<SenderHttpResponseEvent>(100);
    let response_id = og_response.id.clone();
    let workspace_id = og_response.workspace_id.clone();
    let event_source = update_source.clone();
    let event_app_handle = app_handle.clone();
    let event_handle = tokio::spawn(async move {
        while let Some(event) = event_rx.recv().await {
            if response_id.is_empty() {
                continue;
            }

            let persisted = HttpResponseEvent::new(&response_id, &workspace_id, event.into());
            if let Err(err) =
                event_app_handle.db().upsert_http_response_event(&persisted, &event_source)
            {
                warn!("Failed to persist HTTP response event for {response_id}: {err}");
            }
        }
    });

    // Execute the request
    let result = transaction
        .execute_with_cancellation(sendable_request, cancelled_rx.clone(), event_tx)
        .await;

    match result {
        Ok(mut http_response) => {
            // Capture values before consuming http_response
            let status = http_response.status;
            let url = http_response.url.clone();
            let resp_headers = http_response.headers.clone();
            let remote_addr = http_response.remote_addr.clone();
            let version = http_response.version.clone();
            let content_length = http_response.content_length;
            let is_event_stream = is_event_stream_response(&resp_headers);

            let (_body_bytes, body_path, content_length_compressed) =
                if response_ctx.is_persisted() && is_event_stream {
                    let body_id = format!("{}.body", og_response.id);
                    let mut body_stream =
                        http_response.into_body_stream().map_err(|e| GenericError(e.to_string()))?;
                    let mut chunk_index = 0;
                    let mut total_bytes = 0usize;
                    let mut collected = Vec::new();
                    let mut buf = [0u8; 8192];

                    let _ = response_ctx.update(|r| {
                        r.state = HttpResponseState::Connected;
                        r.elapsed_headers = start.elapsed().as_millis() as i32;
                        r.status = status as i32;
                        r.url = url.clone();
                        r.remote_addr = remote_addr.clone();
                        r.version = version.clone();
                        r.content_length = content_length.map(|n| n as i32);
                        r.headers = resp_headers
                            .iter()
                            .map(|(name, value)| yakumo_models::models::HttpResponseHeader {
                                name: name.clone(),
                                value: value.clone(),
                            })
                            .collect();
                    });

                    loop {
                        let n = body_stream
                            .read(&mut buf)
                            .await
                            .map_err(|e| GenericError(e.to_string()))?;
                        if n == 0 {
                            break;
                        }

                        let chunk_bytes = buf[..n].to_vec();
                        total_bytes += n;
                        collected.extend_from_slice(&chunk_bytes);
                        app_handle
                            .blobs()
                            .insert_chunk(&BodyChunk::new(&body_id, chunk_index, chunk_bytes))?;
                        chunk_index += 1;

                        let next_body_path = Some(body_id.clone());
                        let _ = response_ctx.update(|r| {
                            r.state = HttpResponseState::Connected;
                            r.body_path = next_body_path.clone();
                            r.content_length_compressed = Some(total_bytes as i32);
                        });
                    }

                    let path = if collected.is_empty() { None } else { Some(body_id) };
                    (collected, path, Some(total_bytes as i32))
                } else {
                    // Read the response body (consumes http_response)
                    let (bytes, body_stats) =
                        http_response.bytes().await.map_err(|e| GenericError(e.to_string()))?;

                    // Store response body in blob storage if this is a persisted response
                    let path = if response_ctx.is_persisted() && !bytes.is_empty() {
                        let blobs = app_handle.blobs();
                        let body_id = format!("{}.body", og_response.id);
                        let chunk = BodyChunk::new(&body_id, 0, bytes.clone());
                        blobs.insert_chunk(&chunk)?;
                        Some(body_id)
                    } else {
                        None
                    };

                    (bytes, path, Some(body_stats.size_compressed as i32))
                };

            let elapsed = start.elapsed().as_millis() as i32;

            // Update response with results
            let _ = response_ctx.update(|r| {
                r.state = HttpResponseState::Closed;
                r.elapsed = elapsed;
                r.elapsed_headers = elapsed;
                r.status = status as i32;
                r.url = url;
                r.body_path = body_path;
                r.remote_addr = remote_addr;
                r.version = version;
                r.content_length = content_length.map(|n| n as i32);
                r.content_length_compressed = content_length_compressed;
                r.headers = resp_headers
                    .iter()
                    .map(|(name, value)| yakumo_models::models::HttpResponseHeader {
                        name: name.clone(),
                        value: value.clone(),
                    })
                    .collect();
            });

            let _ = event_handle.await;

            Ok(response_ctx.response().clone())
        }
        Err(e) => {
            let error = e.to_string();
            let elapsed = start.elapsed().as_millis() as i32;
            warn!("Failed to send request: {error:?}");
            let _ = response_ctx.update(|r| {
                r.state = HttpResponseState::Closed;
                r.elapsed = elapsed;
                if r.elapsed_headers == 0 {
                    r.elapsed_headers = elapsed;
                }
                r.error = Some(error);
            });
            let _ = event_handle.await;
            Ok(response_ctx.response().clone())
        }
    }
}

fn is_event_stream_response(headers: &[(String, String)]) -> bool {
    headers.iter().any(|(name, value)| {
        name.eq_ignore_ascii_case("content-type")
            && value.to_ascii_lowercase().starts_with("text/event-stream")
    })
}

fn http_proxy_setting(proxy: Option<ProxySetting>) -> HttpConnectionProxySetting {
    match proxy {
        Some(ProxySetting::Disabled) => HttpConnectionProxySetting::Disabled,
        Some(ProxySetting::Enabled { http, https, auth, bypass, disabled }) => {
            if disabled {
                HttpConnectionProxySetting::Disabled
            } else {
                HttpConnectionProxySetting::Enabled {
                    http,
                    https,
                    auth: auth.map(|a| HttpConnectionProxySettingAuth {
                        user: a.user,
                        password: a.password,
                    }),
                    bypass,
                }
            }
        }
        None => HttpConnectionProxySetting::System,
    }
}
