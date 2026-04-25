//! Copy as grpcurl Action.
//!
//! Converts a gRPC request to a grpcurl command.

use yakumo_models::models::GrpcRequest;

/// Convert a gRPC request to a grpcurl command.
pub fn request_to_grpcurl(request: &GrpcRequest) -> String {
    let mut parts: Vec<String> = vec!["grpcurl".to_string()];

    // Plaintext or secure
    if request.url.starts_with("http://") {
        parts.push("-plaintext".to_string());
    }

    // Service and method
    if let Some(service) = &request.service {
        if let Some(method) = &request.method {
            parts.push(format!(
                "-d '{}' {}",
                escape_for_shell(&request.message),
                format_service_method(service, method)
            ));
        } else {
            parts.push(service.to_string());
        }
    }

    // Metadata (headers)
    for header in &request.metadata {
        if header.enabled {
            parts.push(format!(
                "-H '{}: {}'",
                escape_for_shell(&header.name),
                escape_for_shell(&header.value)
            ));
        }
    }

    // Server address (extract host from URL)
    let host = extract_host(&request.url);
    parts.push(host);

    parts.join(" ")
}

/// Format service and method for grpcurl.
fn format_service_method(service: &str, method: &str) -> String {
    // grpcurl expects format: ServiceName/MethodName
    if service.contains('/') { service.to_string() } else { format!("{}/{}", service, method) }
}

/// Extract host from URL (remove protocol).
fn extract_host(url: &str) -> String {
    url.replace("https://", "").replace("http://", "")
}

/// Escape a string for shell usage (single quotes).
fn escape_for_shell(s: &str) -> String {
    s.replace("'", "'\\''")
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use yakumo_models::models::HttpRequestHeader;

    fn create_test_grpc_request() -> GrpcRequest {
        GrpcRequest {
            id: "test".to_string(),
            model: "grpc_request".to_string(),
            created_at: Utc::now().naive_utc(),
            updated_at: Utc::now().naive_utc(),
            workspace_id: "ws".to_string(),
            folder_id: None,
            authentication_type: None,
            authentication: Default::default(),
            description: "".to_string(),
            message: "{}".to_string(),
            metadata: vec![HttpRequestHeader {
                id: None,
                name: "authorization".to_string(),
                value: "Bearer token".to_string(),
                enabled: true,
            }],
            method: Some("GetUser".to_string()),
            name: "Test Request".to_string(),
            service: Some("UserService".to_string()),
            sort_priority: 0.0,
            url: "https://grpc.example.com:443".to_string(),
        }
    }

    #[test]
    fn test_grpcurl_secure() {
        let request = create_test_grpc_request();
        let grpcurl = request_to_grpcurl(&request);

        // Should NOT have -plaintext for https
        assert!(!grpcurl.contains("-plaintext"));
        // Should have service/method
        assert!(grpcurl.contains("UserService/GetUser"));
        // Should have host
        assert!(grpcurl.contains("grpc.example.com:443"));
    }

    #[test]
    fn test_grpcurl_plaintext() {
        let request = GrpcRequest {
            url: "http://grpc.example.com:50051".to_string(),
            ..create_test_grpc_request()
        };

        let grpcurl = request_to_grpcurl(&request);

        // Should have -plaintext for http
        assert!(grpcurl.contains("-plaintext"));
    }

    #[test]
    fn test_grpcurl_with_metadata() {
        let request = create_test_grpc_request();
        let grpcurl = request_to_grpcurl(&request);

        // Should have metadata header
        assert!(grpcurl.contains("-H 'authorization: Bearer token'"));
    }

    #[test]
    fn test_grpcurl_with_message() {
        let request =
            GrpcRequest { message: "{\"id\": \"123\"}".to_string(), ..create_test_grpc_request() };

        let grpcurl = request_to_grpcurl(&request);

        // Should have -d flag
        assert!(grpcurl.contains("-d '{\"id\": \"123\"}'"));
    }
}
