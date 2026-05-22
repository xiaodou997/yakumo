use crate::body_store::{BodyStore, InlineBodyStore};
use crate::error::{Error, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::BTreeMap;
use tokio_util::sync::CancellationToken;
use yaku_domain::{
    AppendRunEvent, BodyRole, CreateRun, DomainService, FinishRun, Protocol, RecordRunBody,
    RequestRepository, Run, RunBodyRepository, RunEventKind, RunRepository, RunState,
    WorkspaceRepository,
};

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Header {
    pub name: String,
    pub value: String,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryParam {
    pub name: String,
    pub value: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpAuthConfig {
    #[serde(rename = "type")]
    pub kind: String,
    #[serde(default)]
    pub username: Option<String>,
    #[serde(default)]
    pub password: Option<String>,
    #[serde(default)]
    pub token: Option<String>,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpRequestConfig {
    pub method: String,
    pub url: String,
    #[serde(default)]
    pub headers: Vec<Header>,
    #[serde(default)]
    pub query: Vec<QueryParam>,
    #[serde(default)]
    pub body: Option<String>,
    #[serde(default)]
    pub auth: Option<HttpAuthConfig>,
    #[serde(default = "default_true")]
    pub follow_redirects: bool,
    #[serde(default)]
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct SendHttp {
    pub run_id: String,
    pub request_id: String,
    pub config_override: Option<BTreeMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct HttpResponse {
    pub status_code: i32,
    pub headers: Vec<Header>,
    pub body: Vec<u8>,
}

pub trait HttpSender {
    fn send(&self, request: &HttpRequestConfig) -> Result<HttpResponse>;

    fn send_with_cancellation(
        &self,
        request: &HttpRequestConfig,
        _cancellation: &CancellationToken,
    ) -> Result<HttpResponse> {
        self.send(request)
    }
}

#[derive(Clone, Default)]
pub struct ReqwestHttpSender;

impl ReqwestHttpSender {
    pub fn new() -> Result<Self> {
        Ok(Self)
    }
}

impl HttpSender for ReqwestHttpSender {
    fn send(&self, request: &HttpRequestConfig) -> Result<HttpResponse> {
        self.send_with_cancellation(request, &CancellationToken::new())
    }

    fn send_with_cancellation(
        &self,
        request: &HttpRequestConfig,
        cancellation: &CancellationToken,
    ) -> Result<HttpResponse> {
        if cancellation.is_cancelled() {
            return Err(Error::Cancelled);
        }
        let runtime = tokio::runtime::Builder::new_multi_thread()
            .enable_time()
            .enable_io()
            .build()
            .map_err(|err| Error::Send(err.to_string()))?;
        runtime.block_on(send_http(request, cancellation.clone()))
    }
}

async fn send_http(
    request: &HttpRequestConfig,
    cancellation: CancellationToken,
) -> Result<HttpResponse> {
    if cancellation.is_cancelled() {
        return Err(Error::Cancelled);
    }

    let method = reqwest::Method::from_bytes(request.method.as_bytes())
        .map_err(|err| Error::InvalidConfig(format!("invalid method: {err}")))?;
    let client = reqwest::Client::builder()
        .redirect(if request.follow_redirects {
            reqwest::redirect::Policy::limited(10)
        } else {
            reqwest::redirect::Policy::none()
        })
        .build()
        .map_err(|err| Error::Send(err.to_string()))?;
    let url = url_with_query(request)?;
    let mut builder = client.request(method, url);

    if let Some(timeout_ms) = request.timeout_ms {
        builder = builder.timeout(std::time::Duration::from_millis(timeout_ms));
    }

    for header in &request.headers {
        builder = builder.header(&header.name, &header.value);
    }

    builder = apply_auth(builder, request.auth.as_ref())?;

    if let Some(body) = &request.body {
        builder = builder.body(body.clone());
    }

    let response = tokio::select! {
        biased;
        _ = cancellation.cancelled() => return Err(Error::Cancelled),
        result = builder.send() => result.map_err(|err| Error::Send(err.to_string()))?,
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
    let body = tokio::select! {
        biased;
        _ = cancellation.cancelled() => return Err(Error::Cancelled),
        result = response.bytes() => result.map_err(|err| Error::Send(err.to_string()))?.to_vec(),
    };

    Ok(HttpResponse { status_code, headers, body })
}

pub struct HttpEngine<S, B = InlineBodyStore> {
    sender: S,
    body_store: B,
}

impl<S> HttpEngine<S> {
    pub fn new(sender: S) -> Self {
        Self { sender, body_store: InlineBodyStore }
    }
}

impl<S, B> HttpEngine<S, B> {
    pub fn with_body_store(sender: S, body_store: B) -> Self {
        Self { sender, body_store }
    }
}

impl<S, B> HttpEngine<S, B>
where
    S: HttpSender,
    B: BodyStore,
{
    pub fn send<R>(&self, service: &DomainService<R>, input: SendHttp) -> Result<Run>
    where
        R: WorkspaceRepository + RequestRepository + RunRepository + RunBodyRepository,
    {
        self.send_with_cancellation(service, input, CancellationToken::new())
    }

    pub fn send_with_cancellation<R>(
        &self,
        service: &DomainService<R>,
        input: SendHttp,
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

        if request.protocol != Protocol::Http && request.protocol != Protocol::Graphql {
            return Err(Error::InvalidConfig(format!(
                "HTTP engine cannot send {:?} request",
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

        if let Some(body) = &config.body {
            service.append_run_event(AppendRunEvent {
                run_id: run.id.clone(),
                sequence: 1,
                kind: RunEventKind::RequestBody,
                data: BTreeMap::from([("text".to_string(), json!(body))]),
                now,
            })?;
        }

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
                    sequence: 2,
                    kind: RunEventKind::ResponseHeaders,
                    data: response_headers_data(response.status_code, &response.headers),
                    now: chrono::Utc::now(),
                })?;
                let body_event = service.append_run_event(AppendRunEvent {
                    run_id: run.id.clone(),
                    sequence: 3,
                    kind: RunEventKind::ResponseBody,
                    data: BTreeMap::from([(
                        "byteLength".to_string(),
                        json!(response.body.len() as i64),
                    )]),
                    now: chrono::Utc::now(),
                })?;
                let stored_body = self.body_store.store(&response.body)?;
                service.record_run_body(RecordRunBody {
                    id: format!("{}.response", run.id),
                    run_id: run.id.clone(),
                    event_id: Some(body_event.id),
                    body_role: BodyRole::Response,
                    content_type: response_content_type(&response.headers),
                    byte_length: response.body.len() as i64,
                    storage_kind: stored_body.storage_kind,
                    storage_ref: stored_body.storage_ref,
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
                    sequence: 2,
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

fn response_content_type(headers: &[Header]) -> Option<String> {
    headers
        .iter()
        .find(|header| header.name.eq_ignore_ascii_case("content-type"))
        .map(|header| header.value.clone())
}

fn request_snapshot_data(
    request_id: &str,
    protocol: Protocol,
    name: &str,
    config: BTreeMap<String, serde_json::Value>,
) -> BTreeMap<String, serde_json::Value> {
    let config = redact_snapshot_config(config);
    BTreeMap::from([
        ("requestId".to_string(), json!(request_id)),
        ("protocol".to_string(), json!(protocol)),
        ("name".to_string(), json!(name)),
        ("config".to_string(), json!(config)),
    ])
}

fn redact_snapshot_config(
    mut config: BTreeMap<String, serde_json::Value>,
) -> BTreeMap<String, serde_json::Value> {
    if let Some(serde_json::Value::Object(auth)) = config.get_mut("auth") {
        if auth.contains_key("password") {
            auth.insert("password".to_string(), json!("<redacted>"));
        }
        if auth.contains_key("token") {
            auth.insert("token".to_string(), json!("<redacted>"));
        }
    }
    config
}

#[derive(Debug, Clone)]
pub struct MockHttpSender {
    response: std::result::Result<HttpResponse, String>,
}

impl MockHttpSender {
    pub fn ok(status_code: i32, body: impl Into<Vec<u8>>) -> Self {
        Self {
            response: Ok(HttpResponse {
                status_code,
                headers: vec![Header {
                    name: "content-type".to_string(),
                    value: "application/json".to_string(),
                }],
                body: body.into(),
            }),
        }
    }

    pub fn fail(message: impl Into<String>) -> Self {
        Self { response: Err(message.into()) }
    }
}

impl HttpSender for MockHttpSender {
    fn send(&self, _request: &HttpRequestConfig) -> Result<HttpResponse> {
        self.response.clone().map_err(Error::Send)
    }
}

fn parse_config(config: BTreeMap<String, serde_json::Value>) -> Result<HttpRequestConfig> {
    let value = serde_json::Value::Object(config.into_iter().collect());
    let config: HttpRequestConfig = serde_json::from_value(value)?;
    if config.method.trim().is_empty() {
        return Err(Error::InvalidConfig("method cannot be empty".to_string()));
    }
    if config.url.trim().is_empty() {
        return Err(Error::InvalidConfig("url cannot be empty".to_string()));
    }
    Ok(config)
}

fn url_with_query(config: &HttpRequestConfig) -> Result<String> {
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

fn apply_auth(
    builder: reqwest::RequestBuilder,
    auth: Option<&HttpAuthConfig>,
) -> Result<reqwest::RequestBuilder> {
    let Some(auth) = auth else {
        return Ok(builder);
    };
    match auth.kind.trim().to_ascii_lowercase().as_str() {
        "" | "none" => Ok(builder),
        "basic" => {
            let username = auth.username.as_deref().unwrap_or_default();
            if username.is_empty() {
                return Err(Error::InvalidConfig(
                    "basic auth username cannot be empty".to_string(),
                ));
            }
            Ok(builder.basic_auth(username, auth.password.clone()))
        }
        "bearer" => {
            let token = auth.token.as_deref().unwrap_or_default();
            if token.is_empty() {
                return Err(Error::InvalidConfig("bearer auth token cannot be empty".to_string()));
            }
            Ok(builder.bearer_auth(token))
        }
        other => Err(Error::InvalidConfig(format!("unsupported auth type: {other}"))),
    }
}

fn request_metadata_data(config: &HttpRequestConfig) -> BTreeMap<String, serde_json::Value> {
    BTreeMap::from([
        ("method".to_string(), json!(config.method)),
        ("url".to_string(), json!(config.url)),
        ("headers".to_string(), json!(config.headers)),
        ("query".to_string(), json!(config.query)),
        (
            "auth".to_string(),
            json!(config.auth.as_ref().map(|auth| auth.kind.as_str()).unwrap_or("none")),
        ),
        ("followRedirects".to_string(), json!(config.follow_redirects)),
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

fn default_true() -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ThresholdBodyStore;
    use chrono::Utc;
    use std::net::SocketAddr;
    use std::sync::mpsc;
    use std::thread;
    use std::time::{Duration, Instant};
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;
    use yaku_domain::{CreateRequest, CreateWorkspace, Page};
    use yaku_store::Store;

    #[test]
    fn mock_http_send_writes_run_events_and_completes() {
        let store = Store::open_in_memory().expect("store opens");
        let service = DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        let mut config = BTreeMap::new();
        config.insert("method".to_string(), json!("GET"));
        config.insert("url".to_string(), json!("https://example.test"));
        let request = service
            .create_request(CreateRequest {
                id: "rq_v2".to_string(),
                node_id: "node_v2".to_string(),
                workspace_id: workspace.id,
                parent_id: None,
                protocol: Protocol::Http,
                name: "Health".to_string(),
                description: String::new(),
                config,
                sort_key: "a".to_string(),
                now,
            })
            .expect("request create");

        let engine = HttpEngine::new(MockHttpSender::ok(200, b"{\"ok\":true}".to_vec()));
        let run = engine
            .send(
                &service,
                SendHttp {
                    run_id: "run_v2".to_string(),
                    request_id: request.id.clone(),
                    config_override: None,
                },
            )
            .expect("send succeeds");
        assert_eq!(run.state, RunState::Completed);
        assert_eq!(run.status_code, Some(200));

        let store = service.into_inner();
        let events = store.list_run_events(&run.id, Page::first(10)).expect("events");
        assert_eq!(events.len(), 4);
        assert_eq!(events[0].kind, RunEventKind::RequestHeaders);
        assert_eq!(events[1].kind, RunEventKind::ResponseHeaders);
        assert_eq!(events[2].kind, RunEventKind::ResponseBody);
        assert_eq!(events[3].kind, RunEventKind::RequestSnapshot);
        assert_eq!(events[3].data["config"]["url"], json!("https://example.test"));
        let bodies = store.list_run_bodies(&run.id).expect("bodies");
        assert_eq!(bodies.len(), 1);
        assert_eq!(bodies[0].event_id, Some(events[2].id));
        assert_eq!(bodies[0].storage_ref, "inline:{\"ok\":true}");
    }

    #[test]
    fn mock_http_send_marks_failed_run() {
        let store = Store::open_in_memory().expect("store opens");
        let service = DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        let mut config = BTreeMap::new();
        config.insert("method".to_string(), json!("GET"));
        config.insert("url".to_string(), json!("https://example.test"));
        let request = service
            .create_request(CreateRequest {
                id: "rq_v2".to_string(),
                node_id: "node_v2".to_string(),
                workspace_id: workspace.id,
                parent_id: None,
                protocol: Protocol::Graphql,
                name: "GraphQL".to_string(),
                description: String::new(),
                config,
                sort_key: "a".to_string(),
                now,
            })
            .expect("request create");

        let engine = HttpEngine::new(MockHttpSender::fail("network down"));
        let run = engine
            .send(
                &service,
                SendHttp {
                    run_id: "run_v2".to_string(),
                    request_id: request.id,
                    config_override: None,
                },
            )
            .expect("send records failed run");
        assert_eq!(run.state, RunState::Failed);
        assert_eq!(run.error.as_deref(), Some("send failed: network down"));
    }

    #[test]
    fn mock_http_send_records_error_event() {
        let store = Store::open_in_memory().expect("store opens");
        let service = DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        let mut config = BTreeMap::new();
        config.insert("method".to_string(), json!("GET"));
        config.insert("url".to_string(), json!("https://example.test"));
        let request = service
            .create_request(CreateRequest {
                id: "rq_v2".to_string(),
                node_id: "node_v2".to_string(),
                workspace_id: workspace.id,
                parent_id: None,
                protocol: Protocol::Http,
                name: "Health".to_string(),
                description: String::new(),
                config,
                sort_key: "a".to_string(),
                now,
            })
            .expect("request create");

        let engine = HttpEngine::new(MockHttpSender::fail("network down"));
        let run = engine
            .send(
                &service,
                SendHttp {
                    run_id: "run_v2".to_string(),
                    request_id: request.id,
                    config_override: None,
                },
            )
            .expect("send records failed run");

        let store = service.into_inner();
        let events = store.list_run_events(&run.id, Page::first(10)).expect("events");
        assert_eq!(events.len(), 3);
        assert_eq!(events[0].kind, RunEventKind::RequestHeaders);
        assert_eq!(events[1].kind, RunEventKind::Error);
        assert_eq!(events[1].data["message"], json!("send failed: network down"));
        assert_eq!(events[2].kind, RunEventKind::RequestSnapshot);
    }

    #[test]
    fn engine_uses_threshold_body_store_for_large_response() {
        let store = Store::open_in_memory().expect("store opens");
        let service = DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        let mut config = BTreeMap::new();
        config.insert("method".to_string(), json!("GET"));
        config.insert("url".to_string(), json!("https://example.test"));
        let request = service
            .create_request(CreateRequest {
                id: "rq_v2".to_string(),
                node_id: "node_v2".to_string(),
                workspace_id: workspace.id,
                parent_id: None,
                protocol: Protocol::Http,
                name: "Health".to_string(),
                description: String::new(),
                config,
                sort_key: "a".to_string(),
                now,
            })
            .expect("request create");
        let dir = std::env::temp_dir().join(format!("yaku-engine-body-{}", std::process::id()));
        let engine = HttpEngine::with_body_store(
            MockHttpSender::ok(200, b"larger-than-limit".to_vec()),
            ThresholdBodyStore::new(&dir, 4),
        );
        let run = engine
            .send(
                &service,
                SendHttp {
                    run_id: "run_v2".to_string(),
                    request_id: request.id,
                    config_override: None,
                },
            )
            .expect("send succeeds");

        let store = service.into_inner();
        let bodies = store.list_run_bodies(&run.id).expect("bodies");
        assert_eq!(bodies.len(), 1);
        assert_eq!(bodies[0].storage_kind, yaku_domain::BodyStorageKind::File);
        let path = bodies[0].storage_ref.strip_prefix("file:").expect("file ref");
        assert_eq!(std::fs::read(path).expect("body file"), b"larger-than-limit");
    }

    #[test]
    fn reqwest_http_sender_writes_real_response_events() {
        let rt = tokio::runtime::Runtime::new().expect("runtime");
        let addr = rt.block_on(spawn_test_server());

        let store = Store::open_in_memory().expect("store opens");
        let service = DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        let mut config = BTreeMap::new();
        config.insert("method".to_string(), json!("POST"));
        config.insert("url".to_string(), json!(format!("http://{addr}/echo")));
        config.insert(
            "query".to_string(),
            json!([
                { "name": "enabled", "value": "yes", "enabled": true },
                { "name": "disabled", "value": "no", "enabled": false }
            ]),
        );
        config.insert(
            "headers".to_string(),
            json!([{ "name": "content-type", "value": "text/plain" }]),
        );
        config.insert(
            "auth".to_string(),
            json!({ "type": "basic", "username": "user", "password": "pass" }),
        );
        config.insert("body".to_string(), json!("hello"));
        config.insert("followRedirects".to_string(), json!(false));
        config.insert("timeoutMs".to_string(), json!(5_000));
        let request = service
            .create_request(CreateRequest {
                id: "rq_v2".to_string(),
                node_id: "node_v2".to_string(),
                workspace_id: workspace.id,
                parent_id: None,
                protocol: Protocol::Http,
                name: "Echo".to_string(),
                description: String::new(),
                config,
                sort_key: "a".to_string(),
                now,
            })
            .expect("request create");

        let engine = HttpEngine::new(ReqwestHttpSender::new().expect("sender"));
        let run = engine
            .send(
                &service,
                SendHttp {
                    run_id: "run_v2".to_string(),
                    request_id: request.id,
                    config_override: None,
                },
            )
            .expect("send succeeds");
        assert_eq!(run.state, RunState::Completed);
        assert_eq!(run.status_code, Some(201));

        let store = service.into_inner();
        let events = store.list_run_events(&run.id, Page::first(10)).expect("events");
        assert_eq!(events.len(), 5);
        assert_eq!(events[0].kind, RunEventKind::RequestHeaders);
        assert_eq!(events[0].data["followRedirects"], json!(false));
        assert_eq!(events[0].data["timeoutMs"], json!(5_000));
        assert_eq!(events[0].data["auth"], json!("basic"));
        assert_eq!(events[0].data["query"][0]["name"], json!("enabled"));
        assert_eq!(events[1].kind, RunEventKind::RequestBody);
        assert_eq!(events[2].kind, RunEventKind::ResponseHeaders);
        assert_eq!(events[2].data["statusCode"], json!(201));
        assert_eq!(events[3].kind, RunEventKind::ResponseBody);
        assert_eq!(events[3].data["byteLength"], json!(11));
        assert_eq!(events[4].kind, RunEventKind::RequestSnapshot);
        assert_eq!(events[4].data["config"]["body"], json!("hello"));
        assert_eq!(events[4].data["config"]["auth"]["type"], json!("basic"));
        assert_eq!(events[4].data["config"]["auth"]["username"], json!("user"));
        assert_eq!(events[4].data["config"]["auth"]["password"], json!("<redacted>"));
        let bodies = store.list_run_bodies(&run.id).expect("bodies");
        assert_eq!(bodies.len(), 1);
        assert_eq!(bodies[0].content_type.as_deref(), Some("application/json"));
        assert_eq!(bodies[0].byte_length, 11);
        assert_eq!(bodies[0].event_id, Some(events[3].id));
    }

    #[test]
    fn reqwest_http_sender_cancels_inflight_request() {
        let rt = tokio::runtime::Runtime::new().expect("runtime");
        let (addr, accepted_rx) = rt.block_on(spawn_hanging_server());
        let cancellation = CancellationToken::new();
        let cancellation_for_thread = cancellation.clone();

        let handle = thread::spawn(move || {
            ReqwestHttpSender::new().expect("sender").send_with_cancellation(
                &HttpRequestConfig {
                    method: "GET".to_string(),
                    url: format!("http://{addr}/hang"),
                    headers: Vec::new(),
                    query: Vec::new(),
                    body: None,
                    auth: None,
                    follow_redirects: true,
                    timeout_ms: Some(60_000),
                },
                &cancellation_for_thread,
            )
        });

        accepted_rx.recv_timeout(Duration::from_secs(2)).expect("server accepted request");
        let started = Instant::now();
        cancellation.cancel();
        let result = handle.join().expect("sender thread joins");

        assert!(matches!(result, Err(Error::Cancelled)));
        assert!(
            started.elapsed() < Duration::from_secs(2),
            "cancel should abort well before request timeout"
        );
    }

    async fn spawn_test_server() -> SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind test server");
        let addr = listener.local_addr().expect("local addr");
        tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.expect("accept");
            let mut buf = vec![0; 4096];
            let n = socket.read(&mut buf).await.expect("read request");
            let request = String::from_utf8_lossy(&buf[..n]);
            assert!(request.starts_with("POST /echo?enabled=yes HTTP/1.1"));
            assert!(!request.contains("disabled=no"));
            assert!(
                request.contains("authorization: Basic dXNlcjpwYXNz")
                    || request.contains("Authorization: Basic dXNlcjpwYXNz")
            );
            let response = concat!(
                "HTTP/1.1 201 Created\r\n",
                "content-type: application/json\r\n",
                "content-length: 11\r\n",
                "\r\n",
                "{\"ok\":true}"
            );
            socket.write_all(response.as_bytes()).await.expect("write response");
        });
        addr
    }

    async fn spawn_hanging_server() -> (SocketAddr, mpsc::Receiver<()>) {
        let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind hanging server");
        let addr = listener.local_addr().expect("local addr");
        let (accepted_tx, accepted_rx) = mpsc::channel();
        tokio::spawn(async move {
            let (_socket, _) = listener.accept().await.expect("accept hanging request");
            let _ = accepted_tx.send(());
            tokio::time::sleep(Duration::from_secs(30)).await;
        });
        (addr, accepted_rx)
    }
}
