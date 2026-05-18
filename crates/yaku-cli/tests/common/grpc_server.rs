use prost::Message as ProstMessage;
use std::sync::{Mutex, mpsc};
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

pub struct TestReflectionServer {
    addr: std::net::SocketAddr,
    shutdown: Mutex<Option<oneshot::Sender<()>>>,
    handle: Mutex<Option<thread::JoinHandle<()>>>,
}

impl TestReflectionServer {
    pub fn spawn() -> Self {
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
        Self { addr, shutdown: Mutex::new(Some(shutdown_tx)), handle: Mutex::new(Some(handle)) }
    }

    pub fn url(&self) -> String {
        format!("http://{}", self.addr)
    }
}

impl Drop for TestReflectionServer {
    fn drop(&mut self) {
        if let Some(shutdown) = self.shutdown.lock().expect("shutdown mutex").take() {
            let _ = shutdown.send(());
        }
        if let Some(handle) = self.handle.lock().expect("handle mutex").take() {
            handle.join().expect("reflection server thread");
        }
    }
}

pub struct TestUnaryGrpcServer {
    addr: std::net::SocketAddr,
    shutdown: Mutex<Option<oneshot::Sender<()>>>,
    handle: Mutex<Option<thread::JoinHandle<()>>>,
}

impl TestUnaryGrpcServer {
    pub fn spawn() -> Self {
        let (addr_tx, addr_rx) = mpsc::channel();
        let (shutdown_tx, shutdown_rx) = oneshot::channel();
        let handle = thread::spawn(move || {
            let runtime = tokio::runtime::Builder::new_multi_thread()
                .enable_io()
                .enable_time()
                .build()
                .expect("runtime");
            runtime.block_on(async move {
                let listener =
                    tokio::net::TcpListener::bind("127.0.0.1:0").await.expect("bind unary server");
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
        Self { addr, shutdown: Mutex::new(Some(shutdown_tx)), handle: Mutex::new(Some(handle)) }
    }

    pub fn url(&self) -> String {
        format!("http://{}", self.addr)
    }
}

impl Drop for TestUnaryGrpcServer {
    fn drop(&mut self) {
        if let Some(shutdown) = self.shutdown.lock().expect("shutdown mutex").take() {
            let _ = shutdown.send(());
        }
        if let Some(handle) = self.handle.lock().expect("handle mutex").take() {
            handle.join().expect("unary server thread");
        }
    }
}

#[derive(Clone, PartialEq, ProstMessage)]
struct PingRequest {
    #[prost(string, tag = "1")]
    name: String,
}

#[derive(Clone, PartialEq, ProstMessage)]
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

    fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<std::result::Result<(), Self::Error>> {
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
                response
                    .headers_mut()
                    .insert(tonic::Status::GRPC_STATUS, (tonic::Code::Unimplemented as i32).into());
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
            dyn std::future::Future<Output = std::result::Result<Response<Self::Response>, Status>>
                + Send,
        >,
    >;

    fn call(&mut self, request: Request<PingRequest>) -> Self::Future {
        let name = request.into_inner().name;
        Box::pin(async move { Ok(Response::new(PingResponse { message: format!("pong {name}") })) })
    }
}
