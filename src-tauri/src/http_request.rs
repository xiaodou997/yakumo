use crate::BuiltinTemplateCallback;
use crate::error::Error::GenericError;
use crate::error::Result;
use crate::models_ext::BlobManagerExt;
use crate::models_ext::QueryManagerExt;
use log::warn;
use std::time::Instant;
use tauri::{AppHandle, Manager, Runtime, WebviewWindow};
use tokio::sync::watch::Receiver;
use yaak_crypto::manager::EncryptionManager;
use yaak_http::cookies::CookieStore;
use yaak_http::sender::ReqwestSender;
use yaak_http::transaction::HttpTransaction;
use yaak_http::types::SendableHttpRequestOptions;
use yaak_models::blob_manager::BodyChunk;
use yaak_models::models::{CookieJar, Environment, HttpRequest, HttpResponse, HttpResponseState};
use yaak_models::util::UpdateSource;
use yaak_templates::{RenderErrorBehavior, RenderOptions};

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
    let rendered_request = yaak::render::render_http_request(
        unrendered_request,
        environment_chain,
        &cb,
        &RenderOptions { error_behavior: RenderErrorBehavior::Throw },
    )
    .await?;

    // Build SendableHttpRequest
    let options = SendableHttpRequestOptions { follow_redirects: true, timeout: None };
    let sendable_request =
        yaak_http::types::SendableHttpRequest::from_http_request(&rendered_request, options)
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
                    .map(|(name, value)| yaak_models::models::HttpResponseHeader {
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
