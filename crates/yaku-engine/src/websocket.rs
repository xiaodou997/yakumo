use crate::error::{Error, Result};
use crate::http::{Header, QueryParam};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::BTreeMap;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_util::sync::CancellationToken;
use yaku_domain::{
    AppendRunEvent, CreateRun, DomainService, FinishRun, Protocol, RequestRepository, Run,
    RunBodyRepository, RunEventKind, RunRepository, RunState, WorkspaceRepository,
};

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebSocketRequestConfig {
    pub url: String,
    #[serde(default)]
    pub headers: Vec<Header>,
    #[serde(default)]
    pub query: Vec<QueryParam>,
    #[serde(default)]
    pub messages: Vec<String>,
    #[serde(default = "default_max_messages")]
    pub max_messages: u32,
    #[serde(default = "default_timeout_ms")]
    pub timeout_ms: u64,
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct SendWebSocket {
    pub run_id: String,
    pub request_id: String,
    pub config_override: Option<BTreeMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct WebSocketMessage {
    pub direction: WebSocketMessageDirection,
    pub kind: WebSocketMessageKind,
    pub text: Option<String>,
    pub byte_length: i64,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum WebSocketMessageDirection {
    Sent,
    Received,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum WebSocketMessageKind {
    Text,
    Binary,
    Ping,
    Pong,
    Close,
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct WebSocketResponse {
    pub status_code: i32,
    pub headers: Vec<Header>,
    pub messages: Vec<WebSocketMessage>,
}

pub trait WebSocketSender {
    fn send(&self, request: &WebSocketRequestConfig) -> Result<WebSocketResponse>;

    fn send_with_cancellation(
        &self,
        request: &WebSocketRequestConfig,
        _cancellation: &CancellationToken,
    ) -> Result<WebSocketResponse> {
        self.send(request)
    }
}

#[derive(Clone, Default)]
pub struct TungsteniteWebSocketSender;

impl TungsteniteWebSocketSender {
    pub fn new() -> Result<Self> {
        Ok(Self)
    }
}

impl WebSocketSender for TungsteniteWebSocketSender {
    fn send(&self, request: &WebSocketRequestConfig) -> Result<WebSocketResponse> {
        self.send_with_cancellation(request, &CancellationToken::new())
    }

    fn send_with_cancellation(
        &self,
        request: &WebSocketRequestConfig,
        cancellation: &CancellationToken,
    ) -> Result<WebSocketResponse> {
        if cancellation.is_cancelled() {
            return Err(Error::Cancelled);
        }
        let runtime = tokio::runtime::Builder::new_multi_thread()
            .enable_time()
            .enable_io()
            .build()
            .map_err(|err| Error::Send(err.to_string()))?;
        runtime.block_on(send_websocket(request, cancellation.clone()))
    }
}

pub struct WebSocketEngine<S> {
    sender: S,
}

impl<S> WebSocketEngine<S> {
    pub fn new(sender: S) -> Self {
        Self { sender }
    }
}

impl<S> WebSocketEngine<S>
where
    S: WebSocketSender,
{
    pub fn send<R>(&self, service: &DomainService<R>, input: SendWebSocket) -> Result<Run>
    where
        R: WorkspaceRepository + RequestRepository + RunRepository + RunBodyRepository,
    {
        self.send_with_cancellation(service, input, CancellationToken::new())
    }

    pub fn send_with_cancellation<R>(
        &self,
        service: &DomainService<R>,
        input: SendWebSocket,
        cancellation: CancellationToken,
    ) -> Result<Run>
    where
        R: WorkspaceRepository + RequestRepository + RunRepository + RunBodyRepository,
    {
        let now = chrono::Utc::now();
        let request = service
            .repository()
            .get_request(&input.request_id)?
            .ok_or_else(|| yaku_domain::Error::NotFound(format!("request {}", input.request_id)))?;

        if request.protocol != Protocol::WebSocket {
            return Err(Error::InvalidConfig(format!(
                "WebSocket engine cannot send {:?} request",
                request.protocol
            )));
        }

        let effective_config = input.config_override.unwrap_or_else(|| request.config.clone());
        let config = parse_config(effective_config.clone())?;
        let run = match service.repository().get_run(&input.run_id)? {
            Some(run) => run,
            None => service.create_run(CreateRun {
                id: input.run_id.clone(),
                request_id: request.id.clone(),
                now,
            })?,
        };

        service.append_run_event(AppendRunEvent {
            run_id: run.id.clone(),
            sequence: 0,
            kind: RunEventKind::RequestHeaders,
            data: request_metadata_data(&config),
            now,
        })?;

        if cancellation.is_cancelled() {
            return Ok(cancel_run(
                service,
                &run.id,
                &request.id,
                request.protocol,
                &request.name,
                effective_config,
            )?);
        }

        match self.sender.send_with_cancellation(&config, &cancellation) {
            Ok(response) => {
                service.append_run_event(AppendRunEvent {
                    run_id: run.id.clone(),
                    sequence: 1,
                    kind: RunEventKind::ResponseHeaders,
                    data: response_headers_data(response.status_code, &response.headers),
                    now: chrono::Utc::now(),
                })?;
                for (index, message) in response.messages.iter().enumerate() {
                    service.append_run_event(AppendRunEvent {
                        run_id: run.id.clone(),
                        sequence: 2 + index as i64,
                        kind: RunEventKind::Message,
                        data: websocket_message_data(message),
                        now: chrono::Utc::now(),
                    })?;
                }
                service.append_run_event(AppendRunEvent {
                    run_id: run.id.clone(),
                    sequence: 2 + response.messages.len() as i64,
                    kind: RunEventKind::Complete,
                    data: BTreeMap::new(),
                    now: chrono::Utc::now(),
                })?;
                service.append_run_event(AppendRunEvent {
                    run_id: run.id.clone(),
                    sequence: 10_000,
                    kind: RunEventKind::RequestSnapshot,
                    data: request_snapshot_data(
                        &request.id,
                        request.protocol.clone(),
                        &request.name,
                        effective_config.clone(),
                    ),
                    now: chrono::Utc::now(),
                })?;
                Ok(service.finish_run(FinishRun {
                    run_id: run.id,
                    state: RunState::Completed,
                    status_code: Some(response.status_code),
                    error: None,
                    now: chrono::Utc::now(),
                })?)
            }
            Err(err) => {
                if err.is_cancelled() {
                    return Ok(cancel_run(
                        service,
                        &run.id,
                        &request.id,
                        request.protocol,
                        &request.name,
                        effective_config,
                    )?);
                }
                let error = err.to_string();
                service.append_run_event(AppendRunEvent {
                    run_id: run.id.clone(),
                    sequence: 1,
                    kind: RunEventKind::Error,
                    data: BTreeMap::from([("message".to_string(), json!(error.clone()))]),
                    now: chrono::Utc::now(),
                })?;
                service.append_run_event(AppendRunEvent {
                    run_id: run.id.clone(),
                    sequence: 10_000,
                    kind: RunEventKind::RequestSnapshot,
                    data: request_snapshot_data(
                        &request.id,
                        request.protocol.clone(),
                        &request.name,
                        effective_config,
                    ),
                    now: chrono::Utc::now(),
                })?;
                Ok(service.finish_run(FinishRun {
                    run_id: run.id,
                    state: RunState::Failed,
                    status_code: None,
                    error: Some(error),
                    now: chrono::Utc::now(),
                })?)
            }
        }
    }
}

fn cancel_run<R>(
    service: &DomainService<R>,
    run_id: &str,
    request_id: &str,
    protocol: Protocol,
    name: &str,
    config: BTreeMap<String, serde_json::Value>,
) -> std::result::Result<Run, yaku_domain::Error>
where
    R: WorkspaceRepository + RequestRepository + RunRepository + RunBodyRepository,
{
    service.append_run_event(AppendRunEvent {
        run_id: run_id.to_string(),
        sequence: 10_000,
        kind: RunEventKind::RequestSnapshot,
        data: request_snapshot_data(request_id, protocol, name, config),
        now: chrono::Utc::now(),
    })?;
    service.finish_run(FinishRun {
        run_id: run_id.to_string(),
        state: RunState::Cancelled,
        status_code: None,
        error: None,
        now: chrono::Utc::now(),
    })
}

#[derive(Debug, Clone)]
pub struct MockWebSocketSender {
    response: std::result::Result<WebSocketResponse, String>,
}

impl MockWebSocketSender {
    pub fn ok(messages: Vec<WebSocketMessage>) -> Self {
        Self {
            response: Ok(WebSocketResponse {
                status_code: 101,
                headers: vec![Header {
                    name: "upgrade".to_string(),
                    value: "websocket".to_string(),
                }],
                messages,
            }),
        }
    }

    pub fn fail(message: impl Into<String>) -> Self {
        Self { response: Err(message.into()) }
    }
}

impl WebSocketSender for MockWebSocketSender {
    fn send(&self, _request: &WebSocketRequestConfig) -> Result<WebSocketResponse> {
        self.response.clone().map_err(Error::Send)
    }
}

async fn send_websocket(
    config: &WebSocketRequestConfig,
    cancellation: CancellationToken,
) -> Result<WebSocketResponse> {
    if cancellation.is_cancelled() {
        return Err(Error::Cancelled);
    }
    let request = websocket_request(config)?;
    let (mut stream, response) = tokio::select! {
        biased;
        _ = cancellation.cancelled() => return Err(Error::Cancelled),
        result = connect_async(request) => result.map_err(|err| Error::Send(err.to_string()))?,
    };
    let status_code = i32::from(response.status().as_u16());
    let headers = response
        .headers()
        .iter()
        .map(|(name, value)| Header {
            name: name.to_string(),
            value: value.to_str().unwrap_or_default().to_string(),
        })
        .collect();
    let mut messages = Vec::new();

    for text in &config.messages {
        tokio::select! {
            biased;
            _ = cancellation.cancelled() => return Err(Error::Cancelled),
            result = stream.send(Message::Text(text.clone().into())) => {
                result.map_err(|err| Error::Send(err.to_string()))?;
            }
        }
        messages.push(WebSocketMessage {
            direction: WebSocketMessageDirection::Sent,
            kind: WebSocketMessageKind::Text,
            text: Some(text.clone()),
            byte_length: text.len() as i64,
        });
    }

    for _ in 0..config.max_messages {
        let next = tokio::select! {
            biased;
            _ = cancellation.cancelled() => return Err(Error::Cancelled),
            result = tokio::time::timeout(
                std::time::Duration::from_millis(config.timeout_ms),
                stream.next(),
            ) => result.map_err(|_| Error::Send("timed out waiting for WebSocket message".to_string()))?,
        };
        let Some(message) = next else {
            break;
        };
        let message = message.map_err(|err| Error::Send(err.to_string()))?;
        let converted = websocket_message(message);
        let is_close = converted.kind == WebSocketMessageKind::Close;
        messages.push(converted);
        if is_close {
            break;
        }
    }

    let _ = stream.close(None).await;
    Ok(WebSocketResponse { status_code, headers, messages })
}

fn websocket_request(
    config: &WebSocketRequestConfig,
) -> Result<tokio_tungstenite::tungstenite::http::Request<()>> {
    let url = url_with_query(config)?;
    let mut request =
        url.into_client_request().map_err(|err| Error::InvalidConfig(err.to_string()))?;
    for header in &config.headers {
        let name = tokio_tungstenite::tungstenite::http::header::HeaderName::from_bytes(
            header.name.as_bytes(),
        )
        .map_err(|err| Error::InvalidConfig(format!("invalid header name: {err}")))?;
        let value = tokio_tungstenite::tungstenite::http::HeaderValue::from_str(&header.value)
            .map_err(|err| Error::InvalidConfig(format!("invalid header value: {err}")))?;
        request.headers_mut().insert(name, value);
    }
    Ok(request)
}

fn websocket_message(message: Message) -> WebSocketMessage {
    match message {
        Message::Text(text) => {
            let text = text.to_string();
            WebSocketMessage {
                direction: WebSocketMessageDirection::Received,
                byte_length: text.len() as i64,
                text: Some(text),
                kind: WebSocketMessageKind::Text,
            }
        }
        Message::Binary(bytes) => WebSocketMessage {
            direction: WebSocketMessageDirection::Received,
            byte_length: bytes.len() as i64,
            text: None,
            kind: WebSocketMessageKind::Binary,
        },
        Message::Ping(bytes) => WebSocketMessage {
            direction: WebSocketMessageDirection::Received,
            byte_length: bytes.len() as i64,
            text: None,
            kind: WebSocketMessageKind::Ping,
        },
        Message::Pong(bytes) => WebSocketMessage {
            direction: WebSocketMessageDirection::Received,
            byte_length: bytes.len() as i64,
            text: None,
            kind: WebSocketMessageKind::Pong,
        },
        Message::Close(_) => WebSocketMessage {
            direction: WebSocketMessageDirection::Received,
            byte_length: 0,
            text: None,
            kind: WebSocketMessageKind::Close,
        },
        Message::Frame(_) => WebSocketMessage {
            direction: WebSocketMessageDirection::Received,
            byte_length: 0,
            text: None,
            kind: WebSocketMessageKind::Binary,
        },
    }
}

fn parse_config(config: BTreeMap<String, serde_json::Value>) -> Result<WebSocketRequestConfig> {
    let value = serde_json::Value::Object(config.into_iter().collect());
    let config: WebSocketRequestConfig = serde_json::from_value(value)?;
    if config.url.trim().is_empty() {
        return Err(Error::InvalidConfig("url cannot be empty".to_string()));
    }
    Ok(config)
}

fn url_with_query(config: &WebSocketRequestConfig) -> Result<String> {
    let mut url = reqwest::Url::parse(&config.url)
        .map_err(|err| Error::InvalidConfig(format!("invalid url: {err}")))?;
    if config.query.iter().any(|param| param.enabled) {
        let mut pairs = url.query_pairs_mut();
        for query in config.query.iter().filter(|param| param.enabled) {
            pairs.append_pair(&query.name, &query.value);
        }
    }
    Ok(url.to_string())
}

fn request_metadata_data(config: &WebSocketRequestConfig) -> BTreeMap<String, serde_json::Value> {
    BTreeMap::from([
        ("url".to_string(), json!(config.url)),
        ("headers".to_string(), json!(config.headers)),
        ("query".to_string(), json!(config.query)),
        ("messages".to_string(), json!(config.messages)),
        ("maxMessages".to_string(), json!(config.max_messages)),
        ("timeoutMs".to_string(), json!(config.timeout_ms)),
    ])
}

fn response_headers_data(
    status_code: i32,
    headers: &[Header],
) -> BTreeMap<String, serde_json::Value> {
    BTreeMap::from([
        ("statusCode".to_string(), json!(status_code)),
        ("headers".to_string(), json!(headers)),
    ])
}

fn request_snapshot_data(
    request_id: &str,
    protocol: Protocol,
    name: &str,
    config: BTreeMap<String, serde_json::Value>,
) -> BTreeMap<String, serde_json::Value> {
    BTreeMap::from([
        ("requestId".to_string(), json!(request_id)),
        ("protocol".to_string(), json!(protocol)),
        ("name".to_string(), json!(name)),
        ("config".to_string(), json!(config)),
    ])
}

fn websocket_message_data(message: &WebSocketMessage) -> BTreeMap<String, serde_json::Value> {
    BTreeMap::from([
        ("direction".to_string(), json!(message.direction)),
        ("kind".to_string(), json!(message.kind)),
        ("text".to_string(), json!(message.text)),
        ("byteLength".to_string(), json!(message.byte_length)),
    ])
}

fn default_max_messages() -> u32 {
    16
}

fn default_timeout_ms() -> u64 {
    30_000
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use std::net::SocketAddr;
    use std::sync::{Arc, Mutex};
    use tokio::net::TcpListener;
    use tokio::task::JoinHandle;
    use yaku_domain::{CreateRequest, CreateWorkspace, Page};
    use yaku_store::Store;

    #[test]
    fn mock_websocket_send_writes_message_events_and_completes() {
        let store = Store::open_in_memory().expect("store opens");
        let service = DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_ws".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        let mut config = BTreeMap::new();
        config.insert("url".to_string(), json!("ws://example.test/socket"));
        let request = service
            .create_request(CreateRequest {
                id: "rq_ws".to_string(),
                node_id: "node_ws".to_string(),
                workspace_id: workspace.id,
                parent_id: None,
                protocol: Protocol::WebSocket,
                name: "Socket".to_string(),
                description: String::new(),
                config,
                sort_key: "a".to_string(),
                now,
            })
            .expect("request create");

        let engine = WebSocketEngine::new(MockWebSocketSender::ok(vec![
            WebSocketMessage {
                direction: WebSocketMessageDirection::Sent,
                kind: WebSocketMessageKind::Text,
                text: Some("ping".to_string()),
                byte_length: 4,
            },
            WebSocketMessage {
                direction: WebSocketMessageDirection::Received,
                kind: WebSocketMessageKind::Text,
                text: Some("pong".to_string()),
                byte_length: 4,
            },
        ]));
        let run = engine
            .send(
                &service,
                SendWebSocket {
                    run_id: "run_ws".to_string(),
                    request_id: request.id.clone(),
                    config_override: None,
                },
            )
            .expect("send succeeds");
        assert_eq!(run.state, RunState::Completed);
        assert_eq!(run.status_code, Some(101));

        let store = service.into_inner();
        let events = store.list_run_events(&run.id, Page::first(10)).expect("events");
        assert_eq!(events.len(), 6);
        assert_eq!(events[0].kind, RunEventKind::RequestHeaders);
        assert_eq!(events[1].kind, RunEventKind::ResponseHeaders);
        assert_eq!(events[2].kind, RunEventKind::Message);
        assert_eq!(events[2].data.get("direction"), Some(&json!("sent")));
        assert_eq!(events[3].data.get("text"), Some(&json!("pong")));
        assert_eq!(events[4].kind, RunEventKind::Complete);
        assert_eq!(events[5].kind, RunEventKind::RequestSnapshot);
    }

    #[test]
    fn tungstenite_sender_connects_sends_and_reads_messages() {
        let runtime = tokio::runtime::Builder::new_multi_thread()
            .enable_io()
            .enable_time()
            .build()
            .expect("runtime");
        let (addr, request_seen, server) = runtime.block_on(spawn_websocket_echo_server());

        let response = TungsteniteWebSocketSender::new()
            .expect("sender")
            .send(&WebSocketRequestConfig {
                url: format!("ws://{addr}/socket"),
                headers: vec![Header { name: "X-WS".to_string(), value: "yes".to_string() }],
                query: vec![QueryParam {
                    name: "room".to_string(),
                    value: "general".to_string(),
                    enabled: true,
                }],
                messages: vec!["ping".to_string()],
                max_messages: 1,
                timeout_ms: 5_000,
            })
            .expect("send succeeds");

        assert_eq!(response.status_code, 101);
        assert_eq!(response.messages.len(), 2);
        assert_eq!(response.messages[0].direction, WebSocketMessageDirection::Sent);
        assert_eq!(response.messages[0].text.as_deref(), Some("ping"));
        assert_eq!(response.messages[1].direction, WebSocketMessageDirection::Received);
        assert_eq!(response.messages[1].text.as_deref(), Some("echo:ping"));

        runtime.block_on(server).expect("server task");
        let request = request_seen.lock().expect("request mutex").clone();
        assert!(request.starts_with("/socket?room=general"));
        assert!(request.to_ascii_lowercase().contains("x-ws: yes"));
    }

    async fn spawn_websocket_echo_server() -> (SocketAddr, Arc<Mutex<String>>, JoinHandle<()>) {
        let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind websocket server");
        let addr = listener.local_addr().expect("local addr");
        let request_seen = Arc::new(Mutex::new(String::new()));
        let request_capture = Arc::clone(&request_seen);
        let handle = tokio::spawn(async move {
            let (stream, _) = listener.accept().await.expect("accept websocket");
            let mut websocket = tokio_tungstenite::accept_hdr_async(
                stream,
                |request: &tokio_tungstenite::tungstenite::handshake::server::Request,
                 response: tokio_tungstenite::tungstenite::handshake::server::Response| {
                    let mut captured = request_capture.lock().expect("request mutex");
                    let headers = request
                        .headers()
                        .iter()
                        .map(|(name, value)| {
                            format!("{}: {}", name, value.to_str().unwrap_or_default())
                        })
                        .collect::<Vec<_>>()
                        .join("\n");
                    *captured = format!("{}\n{headers}", request.uri());
                    Ok(response)
                },
            )
            .await
            .expect("accept websocket handshake");
            if let Some(message) = websocket.next().await {
                let message = message.expect("read websocket message");
                let text = message.to_text().expect("text message");
                websocket
                    .send(Message::Text(format!("echo:{text}").into()))
                    .await
                    .expect("write websocket message");
            }
            let _ = websocket.close(None).await;
        });
        (addr, request_seen, handle)
    }
}
