use prost_reflect::{DynamicMessage, MethodDescriptor, SerializeOptions};
use serde::{Deserialize, Serialize};
use serde_json::Deserializer;
use std::collections::BTreeMap;
use tonic::transport::Uri;
use tonic_reflection::pb::v1::server_reflection_request::MessageRequest;
use tonic_reflection::pb::v1::server_reflection_response::MessageResponse;

mod any;
mod client;
mod codec;
pub mod error;
mod json_schema;
pub mod manager;
mod reflection;
mod transport;

pub use tonic::Code;
pub use tonic::metadata::*;

pub fn serialize_options() -> SerializeOptions {
    SerializeOptions::new().skip_default_fields(false)
}

#[derive(Serialize, Deserialize, Debug, Default)]
#[serde(default, rename_all = "camelCase")]
pub struct ServiceDefinition {
    pub name: String,
    pub methods: Vec<MethodDefinition>,
}

#[derive(Serialize, Deserialize, Debug, Default)]
#[serde(default, rename_all = "camelCase")]
pub struct MethodDefinition {
    pub name: String,
    pub schema: String,
    pub client_streaming: bool,
    pub server_streaming: bool,
}

static SERIALIZE_OPTIONS: &'static SerializeOptions =
    &SerializeOptions::new().skip_default_fields(false).stringify_64_bit_integers(false);

pub fn serialize_message(msg: &DynamicMessage) -> Result<String, String> {
    let mut buf = Vec::new();
    let mut se = serde_json::Serializer::pretty(&mut buf);
    msg.serialize_with_options(&mut se, SERIALIZE_OPTIONS).map_err(|e| e.to_string())?;
    let s = String::from_utf8(buf).expect("serde_json to emit valid utf8");
    Ok(s)
}

pub fn deserialize_message(msg: &str, method: MethodDescriptor) -> Result<DynamicMessage, String> {
    let mut deserializer = Deserializer::from_str(&msg);
    let req_message = DynamicMessage::deserialize(method.input(), &mut deserializer)
        .map_err(|e| e.to_string())?;
    deserializer.end().map_err(|e| e.to_string())?;
    Ok(req_message)
}

pub async fn list_reflection_services(
    uri: &str,
    metadata: &BTreeMap<String, String>,
    validate_certificates: bool,
) -> error::Result<Vec<String>> {
    let uri = uri.parse::<Uri>().map_err(|e| {
        error::Error::GenericError(format!("Failed to parse gRPC endpoint URI: {e}"))
    })?;
    let mut client = client::AutoReflectionClient::new(&uri, validate_certificates, None)?;
    match client
        .send_reflection_request(MessageRequest::ListServices(String::new()), metadata)
        .await?
    {
        MessageResponse::ListServicesResponse(response) => {
            Ok(response.service.into_iter().map(|service| service.name).collect())
        }
        MessageResponse::ErrorResponse(response) => Err(error::Error::GenericError(format!(
            "gRPC reflection error {}: {}",
            response.error_code, response.error_message
        ))),
        _ => Err(error::Error::GenericError(
            "gRPC reflection returned unexpected response type".to_string(),
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeMap;
    use tokio::sync::oneshot;
    use tokio_stream::wrappers::TcpListenerStream;
    use tonic::transport::Server;
    use tonic_reflection::server::Builder;

    #[tokio::test]
    async fn list_reflection_services_reads_local_reflection_server() {
        let listener =
            tokio::net::TcpListener::bind("127.0.0.1:0").await.expect("bind reflection server");
        let addr = listener.local_addr().expect("local addr");
        let (shutdown_tx, shutdown_rx) = oneshot::channel();
        let server = tokio::spawn(async move {
            let service = Builder::configure().build_v1().expect("reflection service");
            Server::builder()
                .add_service(service)
                .serve_with_incoming_shutdown(TcpListenerStream::new(listener), async {
                    let _ = shutdown_rx.await;
                })
                .await
                .expect("serve reflection");
        });

        let services = list_reflection_services(&format!("http://{addr}"), &BTreeMap::new(), true)
            .await
            .expect("list services");
        assert!(services.iter().any(|service| service == "grpc.reflection.v1.ServerReflection"));

        shutdown_tx.send(()).expect("shutdown reflection server");
        server.await.expect("server join");
    }
}
