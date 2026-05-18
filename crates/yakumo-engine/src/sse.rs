use crate::error::{Error, Result};
use crate::http::{Header, QueryParam};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::BTreeMap;
use std::io::Read;
use yakumo_domain::{
    AppendRunEvent, CreateRun, DomainService, FinishRun, Protocol, RequestRepository, Run,
    RunBodyRepository, RunEventKind, RunRepository, RunState, WorkspaceRepository,
};

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SseRequestConfig {
    pub url: String,
    #[serde(default)]
    pub headers: Vec<Header>,
    #[serde(default)]
    pub query: Vec<QueryParam>,
    #[serde(default = "default_true")]
    pub follow_redirects: bool,
    #[serde(default)]
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct SendSse {
    pub run_id: String,
    pub request_id: String,
    pub config_override: Option<BTreeMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct SseEvent {
    pub id: Option<String>,
    pub event: Option<String>,
    pub data: String,
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct SseResponse {
    pub status_code: i32,
    pub headers: Vec<Header>,
    pub events: Vec<SseEvent>,
}

pub trait SseSender {
    fn send(&self, request: &SseRequestConfig) -> Result<SseResponse>;
}

#[derive(Clone, Default)]
pub struct ReqwestSseSender;

impl ReqwestSseSender {
    pub fn new() -> Result<Self> {
        Ok(Self)
    }
}

impl SseSender for ReqwestSseSender {
    fn send(&self, request: &SseRequestConfig) -> Result<SseResponse> {
        let client = reqwest::blocking::Client::builder()
            .redirect(if request.follow_redirects {
                reqwest::redirect::Policy::limited(10)
            } else {
                reqwest::redirect::Policy::none()
            })
            .build()
            .map_err(|err| Error::Send(err.to_string()))?;
        let url = url_with_query(request)?;
        let mut builder = client.get(url).header("accept", "text/event-stream");

        if let Some(timeout_ms) = request.timeout_ms {
            builder = builder.timeout(std::time::Duration::from_millis(timeout_ms));
        }

        for header in &request.headers {
            builder = builder.header(&header.name, &header.value);
        }

        let mut response = builder.send().map_err(|err| Error::Send(err.to_string()))?;
        let status_code = i32::from(response.status().as_u16());
        let headers = response
            .headers()
            .iter()
            .map(|(name, value)| Header {
                name: name.to_string(),
                value: value.to_str().unwrap_or_default().to_string(),
            })
            .collect();
        let mut body = String::new();
        response.read_to_string(&mut body).map_err(|err| Error::Send(err.to_string()))?;
        let events = parse_sse_events(&body);

        Ok(SseResponse { status_code, headers, events })
    }
}

pub struct SseEngine<S> {
    sender: S,
}

impl<S> SseEngine<S> {
    pub fn new(sender: S) -> Self {
        Self { sender }
    }
}

impl<S> SseEngine<S>
where
    S: SseSender,
{
    pub fn send<R>(&self, service: &DomainService<R>, input: SendSse) -> Result<Run>
    where
        R: WorkspaceRepository + RequestRepository + RunRepository + RunBodyRepository,
    {
        let now = chrono::Utc::now();
        let request = service.repository().get_request(&input.request_id)?.ok_or_else(|| {
            yakumo_domain::Error::NotFound(format!("request {}", input.request_id))
        })?;

        if request.protocol != Protocol::Sse {
            return Err(Error::InvalidConfig(format!(
                "SSE engine cannot send {:?} request",
                request.protocol
            )));
        }

        let effective_config = input.config_override.unwrap_or_else(|| request.config.clone());
        let config = parse_config(effective_config.clone())?;
        let run = service.create_run(CreateRun {
            id: input.run_id,
            request_id: request.id.clone(),
            now,
        })?;

        service.append_run_event(AppendRunEvent {
            run_id: run.id.clone(),
            sequence: 0,
            kind: RunEventKind::RequestHeaders,
            data: request_metadata_data(&config),
            now,
        })?;

        match self.sender.send(&config) {
            Ok(response) => {
                service.append_run_event(AppendRunEvent {
                    run_id: run.id.clone(),
                    sequence: 1,
                    kind: RunEventKind::ResponseHeaders,
                    data: response_headers_data(response.status_code, &response.headers),
                    now: chrono::Utc::now(),
                })?;
                for (index, event) in response.events.iter().enumerate() {
                    service.append_run_event(AppendRunEvent {
                        run_id: run.id.clone(),
                        sequence: 2 + index as i64,
                        kind: RunEventKind::Message,
                        data: sse_event_data(event),
                        now: chrono::Utc::now(),
                    })?;
                }
                service.append_run_event(AppendRunEvent {
                    run_id: run.id.clone(),
                    sequence: 2 + response.events.len() as i64,
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

#[derive(Debug, Clone)]
pub struct MockSseSender {
    response: std::result::Result<SseResponse, String>,
}

impl MockSseSender {
    pub fn ok(events: Vec<SseEvent>) -> Self {
        Self {
            response: Ok(SseResponse {
                status_code: 200,
                headers: vec![Header {
                    name: "content-type".to_string(),
                    value: "text/event-stream".to_string(),
                }],
                events,
            }),
        }
    }

    pub fn fail(message: impl Into<String>) -> Self {
        Self { response: Err(message.into()) }
    }
}

impl SseSender for MockSseSender {
    fn send(&self, _request: &SseRequestConfig) -> Result<SseResponse> {
        self.response.clone().map_err(Error::Send)
    }
}

fn parse_config(config: BTreeMap<String, serde_json::Value>) -> Result<SseRequestConfig> {
    let value = serde_json::Value::Object(config.into_iter().collect());
    let config: SseRequestConfig = serde_json::from_value(value)?;
    if config.url.trim().is_empty() {
        return Err(Error::InvalidConfig("url cannot be empty".to_string()));
    }
    Ok(config)
}

fn url_with_query(config: &SseRequestConfig) -> Result<String> {
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

fn request_metadata_data(config: &SseRequestConfig) -> BTreeMap<String, serde_json::Value> {
    BTreeMap::from([
        ("method".to_string(), json!("GET")),
        ("url".to_string(), json!(config.url)),
        ("headers".to_string(), json!(config.headers)),
        ("query".to_string(), json!(config.query)),
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

fn sse_event_data(event: &SseEvent) -> BTreeMap<String, serde_json::Value> {
    BTreeMap::from([
        ("id".to_string(), json!(event.id)),
        ("event".to_string(), json!(event.event)),
        ("data".to_string(), json!(event.data)),
    ])
}

fn parse_sse_events(input: &str) -> Vec<SseEvent> {
    let normalized = input.replace("\r\n", "\n");
    normalized.split("\n\n").filter_map(|chunk| parse_sse_event(chunk.trim_end())).collect()
}

fn parse_sse_event(chunk: &str) -> Option<SseEvent> {
    if chunk.trim().is_empty() {
        return None;
    }

    let mut id = None;
    let mut event = None;
    let mut data = Vec::new();
    for line in chunk.lines() {
        if line.starts_with(':') {
            continue;
        }
        let (field, value) = line
            .split_once(':')
            .map_or((line, ""), |(field, value)| (field, value.strip_prefix(' ').unwrap_or(value)));
        match field {
            "id" => id = Some(value.to_string()),
            "event" => event = Some(value.to_string()),
            "data" => data.push(value.to_string()),
            _ => {}
        }
    }

    if data.is_empty() {
        return None;
    }

    Some(SseEvent { id, event, data: data.join("\n") })
}

fn default_true() -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use yakumo_domain::{CreateRequest, CreateWorkspace, Page};
    use yakumo_store::Store;

    #[test]
    fn parses_sse_events() {
        let events = parse_sse_events(
            ": keepalive\n\nid: 1\nevent: ready\ndata: hello\n\ndata: a\ndata: b\n\n",
        );
        assert_eq!(events.len(), 2);
        assert_eq!(events[0].id.as_deref(), Some("1"));
        assert_eq!(events[0].event.as_deref(), Some("ready"));
        assert_eq!(events[0].data, "hello");
        assert_eq!(events[1].data, "a\nb");
    }

    #[test]
    fn mock_sse_send_writes_message_events_and_completes() {
        let store = Store::open_in_memory().expect("store opens");
        let service = DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_sse".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        let mut config = BTreeMap::new();
        config.insert("url".to_string(), json!("https://example.test/events"));
        let request = service
            .create_request(CreateRequest {
                id: "rq_sse".to_string(),
                node_id: "node_sse".to_string(),
                workspace_id: workspace.id,
                parent_id: None,
                protocol: Protocol::Sse,
                name: "Events".to_string(),
                description: String::new(),
                config,
                sort_key: "a".to_string(),
                now,
            })
            .expect("request create");

        let engine = SseEngine::new(MockSseSender::ok(vec![SseEvent {
            id: Some("1".to_string()),
            event: Some("ready".to_string()),
            data: "hello".to_string(),
        }]));
        let run = engine
            .send(
                &service,
                SendSse {
                    run_id: "run_sse".to_string(),
                    request_id: request.id.clone(),
                    config_override: None,
                },
            )
            .expect("send succeeds");
        assert_eq!(run.state, RunState::Completed);
        assert_eq!(run.status_code, Some(200));

        let store = service.into_inner();
        let events = store.list_run_events(&run.id, Page::first(10)).expect("events");
        assert_eq!(events.len(), 5);
        assert_eq!(events[0].kind, RunEventKind::RequestHeaders);
        assert_eq!(events[1].kind, RunEventKind::ResponseHeaders);
        assert_eq!(events[2].kind, RunEventKind::Message);
        assert_eq!(events[2].data.get("data"), Some(&json!("hello")));
        assert_eq!(events[3].kind, RunEventKind::Complete);
        assert_eq!(events[4].kind, RunEventKind::RequestSnapshot);
    }
}
