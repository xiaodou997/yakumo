use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

pub struct TestHttpServer {
    pub url: String,
    addr: SocketAddr,
    shutdown: Arc<AtomicBool>,
    request: Arc<Mutex<String>>,
    handle: Option<thread::JoinHandle<()>>,
}

impl TestHttpServer {
    pub fn spawn_ok(body: &'static str) -> Self {
        Self::spawn_with_headers(body, &[])
    }

    pub fn spawn_with_headers(body: &'static str, headers: &[&'static str]) -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").expect("Failed to bind test HTTP server");
        let addr = listener.local_addr().expect("Failed to get local addr");
        let url = format!("http://{addr}/test");

        let shutdown = Arc::new(AtomicBool::new(false));
        let shutdown_signal = Arc::clone(&shutdown);
        let body_bytes = body.as_bytes().to_vec();
        let headers = headers.to_vec();
        let request = Arc::new(Mutex::new(String::new()));
        let request_capture = Arc::clone(&request);

        let handle = thread::spawn(move || {
            while let Ok((mut stream, _)) = listener.accept() {
                if shutdown_signal.load(Ordering::Relaxed) {
                    break;
                }

                let _ = stream.set_read_timeout(Some(Duration::from_secs(1)));
                let mut request_buf = [0u8; 4096];
                let bytes_read = stream.read(&mut request_buf).unwrap_or_default();
                if bytes_read > 0
                    && let Ok(mut request) = request_capture.lock()
                {
                    *request = String::from_utf8_lossy(&request_buf[..bytes_read]).to_string();
                }

                let extra_headers = if headers.is_empty() {
                    String::new()
                } else {
                    format!("{}\r\n", headers.join("\r\n"))
                };
                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: {}\r\nConnection: close\r\n{}\r\n",
                    body_bytes.len(),
                    extra_headers
                );
                let _ = stream.write_all(response.as_bytes());
                let _ = stream.write_all(&body_bytes);
                let _ = stream.flush();
                break;
            }
        });

        Self { url, addr, shutdown, request, handle: Some(handle) }
    }

    pub fn request_text(&self) -> String {
        self.request.lock().expect("request capture mutex poisoned").clone()
    }
}

impl Drop for TestHttpServer {
    fn drop(&mut self) {
        self.shutdown.store(true, Ordering::Relaxed);
        let _ = TcpStream::connect(self.addr);

        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}
