use crate::cli::{RequestArgs, RequestCommands, RequestSchemaType};
use crate::context::CliContext;
use crate::utils::confirm::confirm_delete;
use crate::utils::json::{
    apply_merge_patch, is_json_shorthand, merge_workspace_id_arg, parse_optional_json,
    parse_required_json, require_id, validate_create_id,
};
use crate::utils::schema::append_agent_hints;
use crate::utils::workspace::resolve_workspace_id;
use schemars::schema_for;
use serde_json::{Map, Value};
use std::fs;
use std::io::Write;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tokio::sync::mpsc;
use yaak_http::sender::{HttpResponseEvent as SenderHttpResponseEvent, HttpSender, ReqwestSender};
use yaak_http::types::{SendableHttpRequest, SendableHttpRequestOptions};
use yaak_models::models::{
    GrpcRequest, HttpRequest, HttpResponse, HttpResponseEvent, HttpResponseHeader,
    HttpResponseState, UpsertModelInfo, WebsocketRequest,
};
use yaak_models::queries::any_request::AnyRequest;
use yaak_models::util::UpdateSource;

type CommandResult<T = ()> = std::result::Result<T, String>;

pub async fn run(
    ctx: &CliContext,
    args: RequestArgs,
    environment: Option<&str>,
    cookie_jar_id: Option<&str>,
    verbose: bool,
) -> i32 {
    let result = match args.command {
        RequestCommands::List { workspace_id } => list(ctx, workspace_id.as_deref()),
        RequestCommands::Show { request_id } => show(ctx, &request_id),
        RequestCommands::Send { request_id } => {
            return match send_request_by_id(ctx, &request_id, environment, cookie_jar_id, verbose)
                .await
            {
                Ok(()) => 0,
                Err(error) => {
                    eprintln!("Error: {error}");
                    1
                }
            };
        }
        RequestCommands::Schema { request_type, pretty } => {
            return match schema(ctx, request_type, pretty).await {
                Ok(()) => 0,
                Err(error) => {
                    eprintln!("Error: {error}");
                    1
                }
            };
        }
        RequestCommands::Create { workspace_id, name, method, url, json } => {
            create(ctx, workspace_id, name, method, url, json)
        }
        RequestCommands::Update { json, json_input } => update(ctx, json, json_input),
        RequestCommands::Delete { request_id, yes } => delete(ctx, &request_id, yes),
    };

    match result {
        Ok(()) => 0,
        Err(error) => {
            eprintln!("Error: {error}");
            1
        }
    }
}

fn list(ctx: &CliContext, workspace_id: Option<&str>) -> CommandResult {
    let workspace_id = resolve_workspace_id(ctx, workspace_id, "request list")?;
    let requests = ctx
        .db()
        .list_http_requests(&workspace_id)
        .map_err(|e| format!("Failed to list requests: {e}"))?;
    if requests.is_empty() {
        println!("No requests found in workspace {}", workspace_id);
    } else {
        for request in requests {
            println!("{} - {} {}", request.id, request.method, request.name);
        }
    }
    Ok(())
}

async fn schema(ctx: &CliContext, request_type: RequestSchemaType, pretty: bool) -> CommandResult {
    let _ = ctx;
    let mut schema = match request_type {
        RequestSchemaType::Http => serde_json::to_value(schema_for!(HttpRequest))
            .map_err(|e| format!("Failed to serialize HTTP request schema: {e}"))?,
        RequestSchemaType::Grpc => serde_json::to_value(schema_for!(GrpcRequest))
            .map_err(|e| format!("Failed to serialize gRPC request schema: {e}"))?,
        RequestSchemaType::Websocket => serde_json::to_value(schema_for!(WebsocketRequest))
            .map_err(|e| format!("Failed to serialize WebSocket request schema: {e}"))?,
    };

    enrich_schema_guidance(&mut schema, request_type);
    append_agent_hints(&mut schema);

    let output =
        if pretty { serde_json::to_string_pretty(&schema) } else { serde_json::to_string(&schema) }
            .map_err(|e| format!("Failed to format schema JSON: {e}"))?;
    println!("{output}");
    Ok(())
}

fn enrich_schema_guidance(schema: &mut Value, request_type: RequestSchemaType) {
    if !matches!(request_type, RequestSchemaType::Http) {
        return;
    }

    let Some(properties) = schema.get_mut("properties").and_then(Value::as_object_mut) else {
        return;
    };

    if let Some(url_schema) = properties.get_mut("url").and_then(Value::as_object_mut) {
        append_description(
            url_schema,
            "For path segments like `/foo/:id/comments/:commentId`, put concrete values in `urlParameters` using names without `:` (for example `id`, `commentId`).",
        );
    }
}

fn append_description(schema: &mut Map<String, Value>, extra: &str) {
    match schema.get_mut("description") {
        Some(Value::String(existing)) if !existing.trim().is_empty() => {
            if !existing.ends_with(' ') {
                existing.push(' ');
            }
            existing.push_str(extra);
        }
        _ => {
            schema.insert("description".to_string(), Value::String(extra.to_string()));
        }
    }
}

fn create(
    ctx: &CliContext,
    workspace_id: Option<String>,
    name: Option<String>,
    method: Option<String>,
    url: Option<String>,
    json: Option<String>,
) -> CommandResult {
    let json_shorthand =
        workspace_id.as_deref().filter(|v| is_json_shorthand(v)).map(str::to_owned);
    let workspace_id_arg = workspace_id.filter(|v| !is_json_shorthand(v));

    let payload = parse_optional_json(json, json_shorthand, "request create")?;

    if let Some(payload) = payload {
        if name.is_some() || method.is_some() || url.is_some() {
            return Err("request create cannot combine simple flags with JSON payload".to_string());
        }

        validate_create_id(&payload, "request")?;
        let mut request: HttpRequest = serde_json::from_value(payload)
            .map_err(|e| format!("Failed to parse request create JSON: {e}"))?;
        let fallback_workspace_id = if workspace_id_arg.is_none() && request.workspace_id.is_empty()
        {
            Some(resolve_workspace_id(ctx, None, "request create")?)
        } else {
            None
        };
        merge_workspace_id_arg(
            workspace_id_arg.as_deref().or(fallback_workspace_id.as_deref()),
            &mut request.workspace_id,
            "request create",
        )?;

        let created = ctx
            .db()
            .upsert_http_request(&request, &UpdateSource::Sync)
            .map_err(|e| format!("Failed to create request: {e}"))?;

        println!("Created request: {}", created.id);
        return Ok(());
    }

    let workspace_id = resolve_workspace_id(ctx, workspace_id_arg.as_deref(), "request create")?;
    let name = name.unwrap_or_default();
    let url = url.unwrap_or_default();
    let method = method.unwrap_or_else(|| "GET".to_string());

    let request = HttpRequest {
        workspace_id,
        name,
        method: method.to_uppercase(),
        url,
        ..Default::default()
    };

    let created = ctx
        .db()
        .upsert_http_request(&request, &UpdateSource::Sync)
        .map_err(|e| format!("Failed to create request: {e}"))?;

    println!("Created request: {}", created.id);
    Ok(())
}

fn update(ctx: &CliContext, json: Option<String>, json_input: Option<String>) -> CommandResult {
    let patch = parse_required_json(json, json_input, "request update")?;
    let id = require_id(&patch, "request update")?;

    let existing = ctx
        .db()
        .get_http_request(&id)
        .map_err(|e| format!("Failed to get request for update: {e}"))?;
    let updated = apply_merge_patch(&existing, &patch, &id, "request update")?;

    let saved = ctx
        .db()
        .upsert_http_request(&updated, &UpdateSource::Sync)
        .map_err(|e| format!("Failed to update request: {e}"))?;

    println!("Updated request: {}", saved.id);
    Ok(())
}

fn show(ctx: &CliContext, request_id: &str) -> CommandResult {
    let request =
        ctx.db().get_http_request(request_id).map_err(|e| format!("Failed to get request: {e}"))?;
    let output = serde_json::to_string_pretty(&request)
        .map_err(|e| format!("Failed to serialize request: {e}"))?;
    println!("{output}");
    Ok(())
}

fn delete(ctx: &CliContext, request_id: &str, yes: bool) -> CommandResult {
    if !yes && !confirm_delete("request", request_id) {
        println!("Aborted");
        return Ok(());
    }

    let deleted = ctx
        .db()
        .delete_http_request_by_id(request_id, &UpdateSource::Sync)
        .map_err(|e| format!("Failed to delete request: {e}"))?;
    println!("Deleted request: {}", deleted.id);
    Ok(())
}

/// Send a request by ID and print response in the same format as legacy `send`.
pub async fn send_request_by_id(
    ctx: &CliContext,
    request_id: &str,
    environment: Option<&str>,
    cookie_jar_id: Option<&str>,
    verbose: bool,
) -> Result<(), String> {
    let request =
        ctx.db().get_any_request(request_id).map_err(|e| format!("Failed to get request: {e}"))?;
    match request {
        AnyRequest::HttpRequest(http_request) => {
            send_http_request_by_id(ctx, &http_request, environment, cookie_jar_id, verbose).await
        }
        AnyRequest::GrpcRequest(_) => {
            Err("gRPC request send is not implemented yet in yaak-cli".to_string())
        }
        AnyRequest::WebsocketRequest(_) => {
            Err("WebSocket request send is not implemented yet in yaak-cli".to_string())
        }
    }
}

async fn send_http_request_by_id(
    ctx: &CliContext,
    http_request: &HttpRequest,
    environment: Option<&str>,
    cookie_jar_id: Option<&str>,
    verbose: bool,
) -> Result<(), String> {
    let _cookie_jar_id = resolve_cookie_jar_id(ctx, &http_request.workspace_id, cookie_jar_id)?;
    let _environment_id = environment;
    let started = Instant::now();

    // Build sendable request
    let options = SendableHttpRequestOptions { timeout: None, follow_redirects: true };
    let sendable_request = SendableHttpRequest::from_http_request(http_request, options)
        .await
        .map_err(|e| e.to_string())?;

    // Create sender
    let sender = ReqwestSender::new().map_err(|e| e.to_string())?;

    // Create event channel
    let (event_tx, mut event_rx) = mpsc::channel::<SenderHttpResponseEvent>(100);
    let (body_chunk_tx, mut body_chunk_rx) = mpsc::unbounded_channel::<Vec<u8>>();
    let events = Arc::new(Mutex::new(Vec::<SenderHttpResponseEvent>::new()));
    let captured_events = Arc::clone(&events);

    // Spawn event logger task
    let event_handle = tokio::spawn(async move {
        while let Some(event) = event_rx.recv().await {
            if verbose && !matches!(event, SenderHttpResponseEvent::ChunkReceived { .. }) {
                println!("{}", event);
            }
            if let Ok(mut events) = captured_events.lock() {
                events.push(event);
            }
        }
    });

    // Spawn body writer task
    let body_handle = tokio::task::spawn_blocking(move || {
        let mut stdout = std::io::stdout();
        while let Some(chunk) = body_chunk_rx.blocking_recv() {
            if stdout.write_all(&chunk).is_err() {
                break;
            }
            let _ = stdout.flush();
        }
    });

    // Send the request
    let mut response = sender.send(sendable_request, event_tx).await.map_err(|e| e.to_string())?;
    let response_id = <HttpResponse as UpsertModelInfo>::generate_id();

    // Read the body and send chunks
    let body_stream = response.into_body_stream().map_err(|e| e.to_string())?;
    let mut reader = body_stream;
    let mut buf = [0u8; 8192];
    let mut body = Vec::new();
    let mut read_error = None;
    loop {
        match tokio::io::AsyncReadExt::read(&mut reader, &mut buf).await {
            Ok(0) => break,
            Ok(n) => {
                body.extend_from_slice(&buf[..n]);
                let _ = body_chunk_tx.send(buf[..n].to_vec());
            }
            Err(e) => {
                read_error = Some(format!("Failed to read response body: {}", e));
                break;
            }
        }
    }

    drop(body_chunk_tx);
    drop(reader);

    if let Err(e) = body_handle.await {
        return Err(format!("Failed to write response body: {e}"));
    }
    let _ = event_handle.await;

    if let Some(error) = read_error {
        return Err(error);
    }

    let body_path = write_response_body(ctx, &response_id, &body)?;
    let elapsed = saturating_i32(started.elapsed().as_millis());
    let persisted_response = HttpResponse {
        model: "http_response".to_string(),
        id: response_id,
        workspace_id: http_request.workspace_id.clone(),
        request_id: http_request.id.clone(),
        body_path,
        content_length: response.content_length.map(saturating_i32),
        content_length_compressed: Some(saturating_i32(body.len())),
        elapsed,
        elapsed_headers: elapsed,
        headers: response_headers(response.headers),
        remote_addr: response.remote_addr,
        request_headers: response_headers(response.request_headers),
        status: i32::from(response.status),
        status_reason: response.status_reason,
        state: HttpResponseState::Closed,
        url: response.url,
        version: response.version,
        ..Default::default()
    };

    let persisted_response = ctx
        .db()
        .upsert_http_response(&persisted_response, &UpdateSource::Sync, ctx.blob_manager())
        .map_err(|e| format!("Failed to persist response: {e}"))?;

    let captured_events = events
        .lock()
        .map_err(|_| "Failed to persist response events: event collector poisoned".to_string())?
        .clone();
    for event in captured_events {
        let event = HttpResponseEvent::new(
            &persisted_response.id,
            &persisted_response.workspace_id,
            event.into(),
        );
        ctx.db()
            .upsert_http_response_event(&event, &UpdateSource::Sync)
            .map_err(|e| format!("Failed to persist response event: {e}"))?;
    }

    Ok(())
}

fn response_headers(headers: Vec<(String, String)>) -> Vec<HttpResponseHeader> {
    headers.into_iter().map(|(name, value)| HttpResponseHeader { name, value }).collect()
}

fn write_response_body(
    ctx: &CliContext,
    response_id: &str,
    body: &[u8],
) -> Result<Option<String>, String> {
    if body.is_empty() {
        return Ok(None);
    }

    let responses_dir = ctx.data_dir().join("responses");
    fs::create_dir_all(&responses_dir)
        .map_err(|e| format!("Failed to create response body directory: {e}"))?;
    let body_path = responses_dir.join(format!("{response_id}.body"));
    fs::write(&body_path, body).map_err(|e| format!("Failed to write response body: {e}"))?;
    Ok(Some(body_path.to_string_lossy().to_string()))
}

fn saturating_i32<T>(value: T) -> i32
where
    T: TryInto<i32>,
{
    value.try_into().unwrap_or(i32::MAX)
}

pub(crate) fn resolve_cookie_jar_id(
    ctx: &CliContext,
    workspace_id: &str,
    explicit_cookie_jar_id: Option<&str>,
) -> Result<Option<String>, String> {
    if let Some(cookie_jar_id) = explicit_cookie_jar_id {
        return Ok(Some(cookie_jar_id.to_string()));
    }

    let default_cookie_jar = ctx
        .db()
        .list_cookie_jars(workspace_id)
        .map_err(|e| format!("Failed to list cookie jars: {e}"))?
        .into_iter()
        .min_by_key(|jar| jar.created_at)
        .map(|jar| jar.id);
    Ok(default_cookie_jar)
}
