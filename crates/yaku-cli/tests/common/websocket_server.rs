use futures_util::{SinkExt, StreamExt};
use std::net::TcpListener;
use std::sync::{Arc, Mutex};
use std::thread;
use tokio_tungstenite::tungstenite::Message;

pub struct TestWebSocketServer {
    pub url: String,
    request: Arc<Mutex<String>>,
    handle: Mutex<Option<thread::JoinHandle<()>>>,
}

impl TestWebSocketServer {
    pub fn spawn() -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind websocket test server");
        listener.set_nonblocking(true).expect("set nonblocking");
        let addr = listener.local_addr().expect("local addr");
        let request = Arc::new(Mutex::new(String::new()));
        let request_capture = Arc::clone(&request);
        let handle = thread::spawn(move || run_websocket_server(listener, request_capture));
        Self { url: format!("ws://{addr}/socket"), request, handle: Mutex::new(Some(handle)) }
    }

    pub fn request_text(&self) -> String {
        self.request.lock().expect("request mutex").clone()
    }

    pub fn join(&self) {
        if let Some(handle) = self.handle.lock().expect("handle mutex").take() {
            handle.join().expect("websocket server thread");
        }
    }
}

fn run_websocket_server(listener: TcpListener, request: Arc<Mutex<String>>) {
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_io()
        .enable_time()
        .build()
        .expect("runtime");
    runtime.block_on(async move {
        let listener = tokio::net::TcpListener::from_std(listener).expect("tokio listener");
        let (stream, _) =
            tokio::time::timeout(std::time::Duration::from_secs(10), listener.accept())
                .await
                .expect("accept timeout")
                .expect("accept websocket");
        let mut websocket = tokio_tungstenite::accept_hdr_async(
            stream,
            |request_data: &tokio_tungstenite::tungstenite::handshake::server::Request,
             response: tokio_tungstenite::tungstenite::handshake::server::Response| {
                let headers = request_data
                    .headers()
                    .iter()
                    .map(|(name, value)| {
                        format!("{}: {}", name, value.to_str().unwrap_or_default())
                    })
                    .collect::<Vec<_>>()
                    .join("\n");
                *request.lock().expect("request mutex") =
                    format!("{}\n{headers}", request_data.uri());
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
}
