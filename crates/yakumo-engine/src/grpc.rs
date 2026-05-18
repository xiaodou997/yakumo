use crate::error::{Error, Result};
use crate::http::Header;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::BTreeMap;
use std::path::PathBuf;
use yakumo_domain::{
    AppendRunEvent, CreateRun, DomainService, FinishRun, Protocol, RequestRepository, Run,
    RunBodyRepository, RunEventKind, RunRepository, RunState, WorkspaceRepository,
};

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GrpcRequestConfig {
    pub url: String,
    pub service: String,
    pub method: String,
    #[serde(default)]
    pub metadata: Vec<Header>,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub proto_files: Vec<String>,
    #[serde(default = "default_true")]
    pub use_reflection: bool,
    #[serde(default = "default_timeout_ms")]
    pub timeout_ms: u64,
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct SendGrpc {
    pub run_id: String,
    pub request_id: String,
    pub config_override: Option<BTreeMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct GrpcResponse {
    pub status_code: i32,
    pub messages: Vec<serde_json::Value>,
}

pub trait GrpcSender {
    fn send(&self, request: &GrpcRequestConfig) -> Result<GrpcResponse>;
}

#[derive(Clone, Default)]
pub struct UnsupportedGrpcSender;

impl GrpcSender for UnsupportedGrpcSender {
    fn send(&self, _request: &GrpcRequestConfig) -> Result<GrpcResponse> {
        Err(Error::Send(
            "v2 gRPC transport is not implemented yet; request metadata is stored and run history is recorded".to_string(),
        ))
    }
}

#[derive(Clone, Default)]
pub struct ReflectionGrpcSender;

impl ReflectionGrpcSender {
    pub fn new() -> Result<Self> {
        Ok(Self)
    }
}

impl GrpcSender for ReflectionGrpcSender {
    fn send(&self, request: &GrpcRequestConfig) -> Result<GrpcResponse> {
        if !request.use_reflection && request.proto_files.is_empty() {
            return Err(Error::Send(
                "v2 gRPC transport requires server reflection or local proto files".to_string(),
            ));
        }

        let metadata = metadata_map(&request.metadata);
        let runtime = tokio::runtime::Builder::new_multi_thread()
            .enable_time()
            .enable_io()
            .build()
            .map_err(|err| Error::Send(err.to_string()))?;
        if request.message.is_none() {
            let services = runtime
                .block_on(yakumo_grpc::list_reflection_services(&request.url, &metadata, true))
                .map_err(|err| Error::Send(err.to_string()))?;
            return Ok(GrpcResponse {
                status_code: 0,
                messages: vec![json!({
                    "type": "reflection_services",
                    "services": services,
                })],
            });
        }

        let proto_files = request.proto_files.iter().map(PathBuf::from).collect::<Vec<_>>();
        let message = request.message.as_deref().unwrap_or("{}");
        let response = runtime
            .block_on(async {
                let mut handle = yakumo_grpc::manager::GrpcHandle::new();
                let connection = handle
                    .connect("yakumo-v2", &request.url, &proto_files, &metadata, true, None)
                    .await?;
                let response = connection
                    .unary(&request.service, &request.method, message, &metadata, None)
                    .await?;
                yakumo_grpc::serialize_message(response.get_ref())
                    .map_err(yakumo_grpc::error::Error::GenericError)
            })
            .map_err(|err| Error::Send(err.to_string()))?;
        let response_json = serde_json::from_str::<serde_json::Value>(&response)
            .unwrap_or_else(|_| json!({ "text": response }));
        Ok(GrpcResponse { status_code: 0, messages: vec![response_json] })
    }
}

pub struct GrpcEngine<S> {
    sender: S,
}

impl<S> GrpcEngine<S> {
    pub fn new(sender: S) -> Self {
        Self { sender }
    }
}

impl<S> GrpcEngine<S>
where
    S: GrpcSender,
{
    pub fn send<R>(&self, service: &DomainService<R>, input: SendGrpc) -> Result<Run>
    where
        R: WorkspaceRepository + RequestRepository + RunRepository + RunBodyRepository,
    {
        let now = chrono::Utc::now();
        let request = service.repository().get_request(&input.request_id)?.ok_or_else(|| {
            yakumo_domain::Error::NotFound(format!("request {}", input.request_id))
        })?;

        if request.protocol != Protocol::Grpc {
            return Err(Error::InvalidConfig(format!(
                "gRPC engine cannot send {:?} request",
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

        if let Some(message) = &config.message {
            service.append_run_event(AppendRunEvent {
                run_id: run.id.clone(),
                sequence: 1,
                kind: RunEventKind::RequestBody,
                data: BTreeMap::from([("json".to_string(), json!(message))]),
                now: chrono::Utc::now(),
            })?;
        }

        match self.sender.send(&config) {
            Ok(response) => {
                for (index, message) in response.messages.iter().enumerate() {
                    service.append_run_event(AppendRunEvent {
                        run_id: run.id.clone(),
                        sequence: 2 + index as i64,
                        kind: RunEventKind::Message,
                        data: BTreeMap::from([
                            ("direction".to_string(), json!("received")),
                            ("json".to_string(), message.clone()),
                        ]),
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

#[derive(Debug, Clone)]
pub struct MockGrpcSender {
    response: std::result::Result<GrpcResponse, String>,
}

impl MockGrpcSender {
    pub fn ok(messages: Vec<serde_json::Value>) -> Self {
        Self { response: Ok(GrpcResponse { status_code: 0, messages }) }
    }

    pub fn fail(message: impl Into<String>) -> Self {
        Self { response: Err(message.into()) }
    }
}

impl GrpcSender for MockGrpcSender {
    fn send(&self, _request: &GrpcRequestConfig) -> Result<GrpcResponse> {
        self.response.clone().map_err(Error::Send)
    }
}

fn parse_config(config: BTreeMap<String, serde_json::Value>) -> Result<GrpcRequestConfig> {
    let value = serde_json::Value::Object(config.into_iter().collect());
    let config: GrpcRequestConfig = serde_json::from_value(value)?;
    if config.url.trim().is_empty() {
        return Err(Error::InvalidConfig("url cannot be empty".to_string()));
    }
    if config.service.trim().is_empty() {
        return Err(Error::InvalidConfig("service cannot be empty".to_string()));
    }
    if config.method.trim().is_empty() {
        return Err(Error::InvalidConfig("method cannot be empty".to_string()));
    }
    Ok(config)
}

fn request_metadata_data(config: &GrpcRequestConfig) -> BTreeMap<String, serde_json::Value> {
    BTreeMap::from([
        ("url".to_string(), json!(config.url)),
        ("service".to_string(), json!(config.service)),
        ("method".to_string(), json!(config.method)),
        ("metadata".to_string(), json!(config.metadata)),
        ("protoFiles".to_string(), json!(config.proto_files)),
        ("useReflection".to_string(), json!(config.use_reflection)),
        ("timeoutMs".to_string(), json!(config.timeout_ms)),
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

fn metadata_map(headers: &[Header]) -> BTreeMap<String, String> {
    headers.iter().map(|header| (header.name.clone(), header.value.clone())).collect()
}

fn default_true() -> bool {
    true
}

fn default_timeout_ms() -> u64 {
    30_000
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use prost::Message;
    use std::net::SocketAddr;
    use std::sync::mpsc;
    use std::task::{Context, Poll};
    use std::thread;
    use tokio::sync::oneshot;
    use tokio_stream::wrappers::TcpListenerStream;
    use tonic::body::Body;
    use tonic::codegen::http;
    use tonic::server::NamedService;
    use tonic::transport::Server;
    use tonic::{Request, Response, Status};
    use tonic_reflection::server::Builder;
    use yakumo_domain::{CreateRequest, CreateWorkspace, Page};
    use yakumo_store::Store;

    #[test]
    fn unsupported_grpc_sender_records_failed_run() {
        let store = Store::open_in_memory().expect("store opens");
        let service = DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_grpc".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        let mut config = BTreeMap::new();
        config.insert("url".to_string(), json!("http://example.test:50051"));
        config.insert("service".to_string(), json!("example.PingService"));
        config.insert("method".to_string(), json!("Ping"));
        config.insert("message".to_string(), json!("{\"name\":\"yakumo\"}"));
        let request = service
            .create_request(CreateRequest {
                id: "rq_grpc".to_string(),
                node_id: "node_grpc".to_string(),
                workspace_id: workspace.id,
                parent_id: None,
                protocol: Protocol::Grpc,
                name: "Ping".to_string(),
                description: String::new(),
                config,
                sort_key: "a".to_string(),
                now,
            })
            .expect("request create");

        let engine = GrpcEngine::new(UnsupportedGrpcSender);
        let run = engine
            .send(
                &service,
                SendGrpc {
                    run_id: "run_grpc".to_string(),
                    request_id: request.id,
                    config_override: None,
                },
            )
            .expect("send returns failed run");
        assert_eq!(run.state, RunState::Failed);
        assert!(run.error.as_deref().expect("error").contains("not implemented"));

        let store = service.into_inner();
        let events = store.list_run_events(&run.id, Page::first(10)).expect("events");
        assert_eq!(events.len(), 4);
        assert_eq!(events[0].kind, RunEventKind::RequestHeaders);
        assert_eq!(events[0].data["service"], json!("example.PingService"));
        assert_eq!(events[1].kind, RunEventKind::RequestBody);
        assert_eq!(events[2].kind, RunEventKind::Error);
        assert_eq!(events[3].kind, RunEventKind::RequestSnapshot);
    }

    #[test]
    fn mock_grpc_sender_records_messages_and_completes_run() {
        let store = Store::open_in_memory().expect("store opens");
        let service = DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_grpc_ok".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        let mut config = BTreeMap::new();
        config.insert("url".to_string(), json!("http://example.test:50051"));
        config.insert("service".to_string(), json!("example.PingService"));
        config.insert("method".to_string(), json!("Ping"));
        let request = service
            .create_request(CreateRequest {
                id: "rq_grpc_ok".to_string(),
                node_id: "node_grpc_ok".to_string(),
                workspace_id: workspace.id,
                parent_id: None,
                protocol: Protocol::Grpc,
                name: "Ping".to_string(),
                description: String::new(),
                config,
                sort_key: "a".to_string(),
                now,
            })
            .expect("request create");

        let engine = GrpcEngine::new(MockGrpcSender::ok(vec![json!({
            "type": "reflection_services",
            "services": ["grpc.reflection.v1.ServerReflection"]
        })]));
        let run = engine
            .send(
                &service,
                SendGrpc {
                    run_id: "run_grpc_ok".to_string(),
                    request_id: request.id,
                    config_override: None,
                },
            )
            .expect("send succeeds");
        assert_eq!(run.state, RunState::Completed);
        assert_eq!(run.status_code, Some(0));

        let store = service.into_inner();
        let events = store.list_run_events(&run.id, Page::first(10)).expect("events");
        assert_eq!(events.len(), 4);
        assert_eq!(events[0].kind, RunEventKind::RequestHeaders);
        assert_eq!(events[1].kind, RunEventKind::Message);
        assert_eq!(events[1].data["json"]["type"], json!("reflection_services"));
        assert_eq!(events[2].kind, RunEventKind::Complete);
        assert_eq!(events[3].kind, RunEventKind::RequestSnapshot);
    }

    #[test]
    fn reflection_sender_records_services_from_local_reflection_server() {
        let reflection_server = TestReflectionServer::spawn();
        let store = Store::open_in_memory().expect("store opens");
        let service = DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_grpc_reflect".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        let mut config = BTreeMap::new();
        config.insert("url".to_string(), json!(reflection_server.url()));
        config.insert("service".to_string(), json!("grpc.reflection.v1.ServerReflection"));
        config.insert("method".to_string(), json!("ServerReflectionInfo"));
        let request = service
            .create_request(CreateRequest {
                id: "rq_grpc_reflect".to_string(),
                node_id: "node_grpc_reflect".to_string(),
                workspace_id: workspace.id,
                parent_id: None,
                protocol: Protocol::Grpc,
                name: "Reflect".to_string(),
                description: String::new(),
                config,
                sort_key: "a".to_string(),
                now,
            })
            .expect("request create");

        let engine = GrpcEngine::new(ReflectionGrpcSender::new().expect("sender"));
        let run = engine
            .send(
                &service,
                SendGrpc {
                    run_id: "run_grpc_reflect".to_string(),
                    request_id: request.id,
                    config_override: None,
                },
            )
            .expect("reflection succeeds");
        assert_eq!(run.state, RunState::Completed);
        assert_eq!(run.status_code, Some(0));

        let store = service.into_inner();
        let events = store.list_run_events(&run.id, Page::first(10)).expect("events");
        assert_eq!(events.len(), 4);
        assert_eq!(events[0].kind, RunEventKind::RequestHeaders);
        assert_eq!(events[1].kind, RunEventKind::Message);
        assert_eq!(events[1].data["json"]["type"], json!("reflection_services"));
        let services = events[1].data["json"]["services"].as_array().expect("services array");
        assert!(services.iter().any(|service| service == "grpc.reflection.v1.ServerReflection"));
        assert_eq!(events[2].kind, RunEventKind::Complete);
        assert_eq!(events[3].kind, RunEventKind::RequestSnapshot);
    }

    #[test]
    fn reflection_sender_invokes_unary_with_local_proto_file() {
        let unary_server = TestUnaryGrpcServer::spawn();
        let proto_dir = tempfile::tempdir().expect("temp proto dir");
        let proto_path = proto_dir.path().join("ping.proto");
        std::fs::write(
            &proto_path,
            r#"
                syntax = "proto3";
                package example;
                service PingService {
                  rpc Ping (PingRequest) returns (PingResponse);
                }
                message PingRequest {
                  string name = 1;
                }
                message PingResponse {
                  string message = 1;
                }
            "#,
        )
        .expect("write proto");

        let store = Store::open_in_memory().expect("store opens");
        let service = DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_grpc_unary".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        let mut config = BTreeMap::new();
        config.insert("url".to_string(), json!(unary_server.url()));
        config.insert("service".to_string(), json!("example.PingService"));
        config.insert("method".to_string(), json!("Ping"));
        config.insert("message".to_string(), json!("{\"name\":\"yakumo\"}"));
        config.insert("protoFiles".to_string(), json!([proto_path.to_string_lossy()]));
        config.insert("useReflection".to_string(), json!(false));
        let request = service
            .create_request(CreateRequest {
                id: "rq_grpc_unary".to_string(),
                node_id: "node_grpc_unary".to_string(),
                workspace_id: workspace.id,
                parent_id: None,
                protocol: Protocol::Grpc,
                name: "Ping".to_string(),
                description: String::new(),
                config,
                sort_key: "a".to_string(),
                now,
            })
            .expect("request create");

        let engine = GrpcEngine::new(ReflectionGrpcSender::new().expect("sender"));
        let run = engine
            .send(
                &service,
                SendGrpc {
                    run_id: "run_grpc_unary".to_string(),
                    request_id: request.id,
                    config_override: None,
                },
            )
            .expect("unary succeeds");
        assert_eq!(run.state, RunState::Completed);
        assert_eq!(run.status_code, Some(0));

        let store = service.into_inner();
        let events = store.list_run_events(&run.id, Page::first(10)).expect("events");
        assert_eq!(events.len(), 5);
        assert_eq!(events[0].kind, RunEventKind::RequestHeaders);
        assert_eq!(events[1].kind, RunEventKind::RequestBody);
        assert_eq!(events[2].kind, RunEventKind::Message);
        assert_eq!(events[2].data["json"]["message"], json!("pong yakumo"));
        assert_eq!(events[3].kind, RunEventKind::Complete);
        assert_eq!(events[4].kind, RunEventKind::RequestSnapshot);
    }

    struct TestReflectionServer {
        addr: SocketAddr,
        shutdown: Option<oneshot::Sender<()>>,
        handle: Option<thread::JoinHandle<()>>,
    }

    impl TestReflectionServer {
        fn spawn() -> Self {
            let (addr_tx, addr_rx) = mpsc::channel();
            let (shutdown_tx, shutdown_rx) = oneshot::channel();
            let handle = thread::spawn(move || {
                let runtime = tokio::runtime::Builder::new_multi_thread()
                    .enable_io()
                    .enable_time()
                    .build()
                    .expect("runtime");
                runtime.block_on(async move {
                    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
                        .await
                        .expect("bind reflection server");
                    let addr = listener.local_addr().expect("local addr");
                    addr_tx.send(addr).expect("send addr");
                    let service = Builder::configure().build_v1().expect("reflection service");
                    Server::builder()
                        .add_service(service)
                        .serve_with_incoming_shutdown(TcpListenerStream::new(listener), async {
                            let _ = shutdown_rx.await;
                        })
                        .await
                        .expect("serve reflection");
                });
            });
            let addr = addr_rx.recv().expect("receive addr");
            Self { addr, shutdown: Some(shutdown_tx), handle: Some(handle) }
        }

        fn url(&self) -> String {
            format!("http://{}", self.addr)
        }
    }

    impl Drop for TestReflectionServer {
        fn drop(&mut self) {
            if let Some(shutdown) = self.shutdown.take() {
                let _ = shutdown.send(());
            }
            if let Some(handle) = self.handle.take() {
                handle.join().expect("reflection server thread");
            }
        }
    }

    #[derive(Clone, PartialEq, Message)]
    struct PingRequest {
        #[prost(string, tag = "1")]
        name: String,
    }

    #[derive(Clone, PartialEq, Message)]
    struct PingResponse {
        #[prost(string, tag = "1")]
        message: String,
    }

    #[derive(Clone, Default)]
    struct PingServer;

    impl<B> tonic::codegen::Service<http::Request<B>> for PingServer
    where
        B: tonic::codegen::Body + Send + 'static,
        B::Error: Into<tonic::codegen::StdError> + Send + 'static,
    {
        type Response = http::Response<Body>;
        type Error = std::convert::Infallible;
        type Future = std::pin::Pin<
            Box<
                dyn std::future::Future<Output = std::result::Result<Self::Response, Self::Error>>
                    + Send,
            >,
        >;

        fn poll_ready(
            &mut self,
            _cx: &mut Context<'_>,
        ) -> Poll<std::result::Result<(), Self::Error>> {
            Poll::Ready(Ok(()))
        }

        fn call(&mut self, req: http::Request<B>) -> Self::Future {
            match req.uri().path() {
                "/example.PingService/Ping" => {
                    let fut = async move {
                        let method = PingUnary;
                        let codec = tonic_prost::ProstCodec::<PingResponse, PingRequest>::default();
                        let mut grpc = tonic::server::Grpc::new(codec);
                        Ok(grpc.unary(method, req).await)
                    };
                    Box::pin(fut)
                }
                _ => Box::pin(async move {
                    let mut response = http::Response::new(Body::default());
                    response.headers_mut().insert(
                        tonic::Status::GRPC_STATUS,
                        (tonic::Code::Unimplemented as i32).into(),
                    );
                    response
                        .headers_mut()
                        .insert(http::header::CONTENT_TYPE, tonic::metadata::GRPC_CONTENT_TYPE);
                    Ok(response)
                }),
            }
        }
    }

    impl NamedService for PingServer {
        const NAME: &'static str = "example.PingService";
    }

    #[derive(Clone, Default)]
    struct PingUnary;

    impl tonic::server::UnaryService<PingRequest> for PingUnary {
        type Response = PingResponse;
        type Future = std::pin::Pin<
            Box<
                dyn std::future::Future<
                        Output = std::result::Result<Response<Self::Response>, Status>,
                    > + Send,
            >,
        >;

        fn call(&mut self, request: Request<PingRequest>) -> Self::Future {
            let name = request.into_inner().name;
            Box::pin(
                async move { Ok(Response::new(PingResponse { message: format!("pong {name}") })) },
            )
        }
    }

    struct TestUnaryGrpcServer {
        addr: SocketAddr,
        shutdown: Option<oneshot::Sender<()>>,
        handle: Option<thread::JoinHandle<()>>,
    }

    impl TestUnaryGrpcServer {
        fn spawn() -> Self {
            let (addr_tx, addr_rx) = mpsc::channel();
            let (shutdown_tx, shutdown_rx) = oneshot::channel();
            let handle = thread::spawn(move || {
                let runtime = tokio::runtime::Builder::new_multi_thread()
                    .enable_io()
                    .enable_time()
                    .build()
                    .expect("runtime");
                runtime.block_on(async move {
                    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
                        .await
                        .expect("bind unary server");
                    let addr = listener.local_addr().expect("local addr");
                    addr_tx.send(addr).expect("send addr");
                    Server::builder()
                        .add_service(PingServer)
                        .serve_with_incoming_shutdown(TcpListenerStream::new(listener), async {
                            let _ = shutdown_rx.await;
                        })
                        .await
                        .expect("serve unary");
                });
            });
            let addr = addr_rx.recv().expect("receive addr");
            Self { addr, shutdown: Some(shutdown_tx), handle: Some(handle) }
        }

        fn url(&self) -> String {
            format!("http://{}", self.addr)
        }
    }

    impl Drop for TestUnaryGrpcServer {
        fn drop(&mut self) {
            if let Some(shutdown) = self.shutdown.take() {
                let _ = shutdown.send(());
            }
            if let Some(handle) = self.handle.take() {
                handle.join().expect("unary server thread");
            }
        }
    }
}
