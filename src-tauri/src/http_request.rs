use crate::BuiltinTemplateCallback;
use crate::error::Error::GenericError;
use crate::error::Result;
use crate::models_ext::BlobManagerExt;
use crate::models_ext::QueryManagerExt;
use log::warn;
use std::time::Instant;
use tauri::{AppHandle, Listener, Manager, Runtime, WebviewWindow};
use tokio::sync::watch::Receiver;
use yakumo_crypto::manager::EncryptionManager;
use yakumo_http::cookies::CookieStore;
use yakumo_http::sender::ReqwestSender;
use yakumo_http::transaction::HttpTransaction;
use yakumo_http::types::SendableHttpRequestOptions;
use yakumo_models::blob_manager::BodyChunk;
use yakumo_models::models::{CookieJar, Environment, HttpRequest, HttpResponse, HttpResponseState};
use yakumo_models::util::UpdateSource;
use yakumo_templates::{RenderErrorBehavior, RenderOptions};

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
        ResponseContext::new(app_handle.clone(), og_response.clone(), update_source);

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

    // Create HTTP sender and transaction
    let sender = ReqwestSender::new().map_err(|e| GenericError(e.to_string()))?;

    // Create cookie store if we have a cookie jar
    let transaction = if let Some(jar) = &cookie_jar {
        let cookie_store = CookieStore::from_cookies(jar.cookies.clone());
        HttpTransaction::with_cookie_store(sender, cookie_store)
    } else {
        HttpTransaction::new(sender)
    };

    // Create event channel for HTTP events
    let (event_tx, _event_rx) = tokio::sync::mpsc::channel(100);

    // Execute the request
    let result = transaction
        .execute_with_cancellation(sendable_request, cancelled_rx.clone(), event_tx)
        .await;

    match result {
        Ok(http_response) => {
            // Capture values before consuming http_response
            let status = http_response.status;
            let url = http_response.url.clone();
            let resp_headers = http_response.headers.clone();

            // Read the response body (consumes http_response)
            let (body_bytes, _body_stats) =
                http_response.bytes().await.map_err(|e| GenericError(e.to_string()))?;

            let elapsed = start.elapsed().as_millis() as i32;

            // Store response body in blob storage if this is a persisted response
            let body_path = if response_ctx.is_persisted() && !body_bytes.is_empty() {
                let blobs = app_handle.blobs();
                let body_id = format!("{}.body", og_response.id);
                // Store as a single chunk
                let chunk = BodyChunk::new(&body_id, 0, body_bytes.clone());
                blobs.insert_chunk(&chunk)?;
                // Return the body_id as the path identifier
                Some(body_id)
            } else {
                None
            };

            // Update response with results
            let _ = response_ctx.update(|r| {
                r.state = HttpResponseState::Closed;
                r.elapsed = elapsed;
                r.elapsed_headers = elapsed;
                r.status = status as i32;
                r.url = url;
                r.body_path = body_path;
                r.headers = resp_headers
                    .iter()
                    .map(|(name, value)| yakumo_models::models::HttpResponseHeader {
                        name: name.clone(),
                        value: value.clone(),
                    })
                    .collect();
            });

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
            Ok(response_ctx.response().clone())
        }
    }
}
