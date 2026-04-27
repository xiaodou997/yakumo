//! Yakumo workspace import.
//!
//! Imports workspace data from exported JSON.

use crate::events::{ImportResources, ImportResponse};
use yakumo_models::models::{
    Environment, Folder, GrpcRequest, HttpRequest, WebsocketRequest, Workspace,
};

/// Import Yakumo workspace from JSON content.
pub fn import_yakumo(content: &str) -> Result<Option<ImportResponse>, String> {
    // Try to parse the JSON content
    let json: serde_json::Value =
        serde_json::from_str(content).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    // Check if it's a valid export format
    if !json.is_object() {
        return Ok(None);
    }

    let resources = parse_import_resources(&json)?;

    // If no resources were found, return None
    if resources.workspaces.is_empty()
        && resources.environments.is_empty()
        && resources.http_requests.is_empty()
        && resources.grpc_requests.is_empty()
        && resources.websocket_requests.is_empty()
    {
        return Ok(None);
    }

    Ok(Some(ImportResponse { resources: Some(resources), error: None }))
}

/// Parse import resources from JSON.
fn parse_import_resources(json: &serde_json::Value) -> Result<ImportResources, String> {
    let obj = json.as_object().ok_or("Expected object")?;
    let source = obj.get("resources").and_then(serde_json::Value::as_object).unwrap_or(obj);

    let workspaces = parse_array(source.get("workspaces"), parse_workspace)?;
    let environments = parse_array(source.get("environments"), parse_environment)?;
    let folders = parse_array(source.get("folders"), parse_folder)?;
    let http_requests = parse_array(source.get("httpRequests"), parse_http_request)?;
    let grpc_requests = parse_array(source.get("grpcRequests"), parse_grpc_request)?;
    let websocket_requests = parse_array(source.get("websocketRequests"), parse_websocket_request)?;

    Ok(ImportResources {
        workspaces,
        environments,
        folders,
        http_requests,
        grpc_requests,
        websocket_requests,
    })
}

/// Parse an array of items using a parser function.
fn parse_array<T, F>(value: Option<&serde_json::Value>, parser: F) -> Result<Vec<T>, String>
where
    F: Fn(&serde_json::Value) -> Result<T, String>,
{
    match value {
        Some(serde_json::Value::Array(arr)) => arr.iter().map(parser).collect(),
        _ => Ok(vec![]),
    }
}

/// Parse a workspace from JSON.
fn parse_workspace(json: &serde_json::Value) -> Result<Workspace, String> {
    serde_json::from_value(json.clone()).map_err(|e| format!("Failed to parse workspace: {}", e))
}

/// Parse an environment from JSON.
fn parse_environment(json: &serde_json::Value) -> Result<Environment, String> {
    serde_json::from_value(json.clone()).map_err(|e| format!("Failed to parse environment: {}", e))
}

/// Parse a folder from JSON.
fn parse_folder(json: &serde_json::Value) -> Result<Folder, String> {
    serde_json::from_value(json.clone()).map_err(|e| format!("Failed to parse folder: {}", e))
}

/// Parse an HTTP request from JSON.
fn parse_http_request(json: &serde_json::Value) -> Result<HttpRequest, String> {
    serde_json::from_value(json.clone()).map_err(|e| format!("Failed to parse HTTP request: {}", e))
}

/// Parse a gRPC request from JSON.
fn parse_grpc_request(json: &serde_json::Value) -> Result<GrpcRequest, String> {
    serde_json::from_value(json.clone()).map_err(|e| format!("Failed to parse gRPC request: {}", e))
}

/// Parse a WebSocket request from JSON.
fn parse_websocket_request(json: &serde_json::Value) -> Result<WebsocketRequest, String> {
    serde_json::from_value(json.clone())
        .map_err(|e| format!("Failed to parse WebSocket request: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_import_empty() {
        let result = import_yakumo("{}").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_import_invalid_json() {
        let result = import_yakumo("not json");
        assert!(result.is_err());
    }

    #[test]
    fn test_import_full_yakumo_export() {
        let content = serde_json::json!({
            "workspaces": [{
                "model": "workspace",
                "id": "wk_1",
                "createdAt": "2026-04-26T00:00:00",
                "updatedAt": "2026-04-26T00:00:00",
                "authentication": {},
                "authenticationType": null,
                "description": "Workspace export",
                "headers": [],
                "name": "Demo",
                "encryptionKeyChallenge": null,
                "settingValidateCertificates": true,
                "settingFollowRedirects": true,
                "settingRequestTimeout": 0,
                "settingDnsOverrides": []
            }],
            "environments": [{
                "model": "environment",
                "id": "ev_1",
                "createdAt": "2026-04-26T00:00:00",
                "updatedAt": "2026-04-26T00:00:00",
                "workspaceId": "wk_1",
                "name": "Base",
                "variables": [],
                "color": null,
                "parentModel": "workspace",
                "parentId": null
            }],
            "folders": [{
                "model": "folder",
                "id": "fl_1",
                "createdAt": "2026-04-26T00:00:00",
                "updatedAt": "2026-04-26T00:00:00",
                "workspaceId": "wk_1",
                "folderId": null,
                "authentication": {},
                "authenticationType": null,
                "description": "",
                "headers": [],
                "name": "Folder",
                "sortPriority": 0
            }],
            "httpRequests": [{
                "model": "http_request",
                "id": "rq_1",
                "createdAt": "2026-04-26T00:00:00",
                "updatedAt": "2026-04-26T00:00:00",
                "workspaceId": "wk_1",
                "folderId": "fl_1",
                "authentication": {},
                "authenticationType": null,
                "body": { "text": "{}" },
                "bodyType": "application/json",
                "description": "",
                "headers": [],
                "method": "POST",
                "name": "Create",
                "sortPriority": 0,
                "url": "https://api.example.com/users",
                "urlParameters": []
            }],
            "grpcRequests": [{
                "model": "grpc_request",
                "id": "gr_1",
                "createdAt": "2026-04-26T00:00:00",
                "updatedAt": "2026-04-26T00:00:00",
                "workspaceId": "wk_1",
                "folderId": "fl_1",
                "authentication": {},
                "authenticationType": null,
                "description": "",
                "message": "{}",
                "metadata": [],
                "method": "GetUser",
                "name": "Get User",
                "service": "users.UserService",
                "sortPriority": 0,
                "url": "https://grpc.example.com"
            }],
            "websocketRequests": [{
                "model": "websocket_request",
                "id": "wr_1",
                "createdAt": "2026-04-26T00:00:00",
                "updatedAt": "2026-04-26T00:00:00",
                "workspaceId": "wk_1",
                "folderId": "fl_1",
                "authentication": {},
                "authenticationType": null,
                "description": "",
                "headers": [],
                "message": "{\"ping\":true}",
                "name": "Socket",
                "sortPriority": 0,
                "url": "wss://socket.example.com",
                "urlParameters": []
            }]
        })
        .to_string();

        let result = import_yakumo(&content).unwrap().unwrap();
        let resources = result.resources.unwrap();
        assert_eq!(resources.workspaces[0].id, "wk_1");
        assert_eq!(resources.environments[0].id, "ev_1");
        assert_eq!(resources.folders.len(), 1);
        assert_eq!(resources.http_requests.len(), 1);
        assert_eq!(resources.grpc_requests.len(), 1);
        assert_eq!(resources.websocket_requests.len(), 1);
        assert_eq!(resources.http_requests[0].folder_id.as_deref(), Some("fl_1"));
    }

    #[test]
    fn test_import_nested_workspace_export() {
        let content = serde_json::json!({
            "yakumoVersion": "0.0.2",
            "yakumoSchema": 4,
            "timestamp": "2026-04-27T00:00:00",
            "resources": {
                "workspaces": [{
                    "model": "workspace",
                    "id": "wk_1",
                    "createdAt": "2026-04-26T00:00:00",
                    "updatedAt": "2026-04-26T00:00:00",
                    "authentication": {},
                    "authenticationType": null,
                    "description": "Workspace export",
                    "headers": [],
                    "name": "Demo",
                    "encryptionKeyChallenge": null,
                    "settingValidateCertificates": true,
                    "settingFollowRedirects": true,
                    "settingRequestTimeout": 0,
                    "settingDnsOverrides": []
                }],
                "environments": [{
                    "model": "environment",
                    "id": "ev_1",
                    "createdAt": "2026-04-26T00:00:00",
                    "updatedAt": "2026-04-26T00:00:00",
                    "workspaceId": "wk_1",
                    "name": "Base",
                    "variables": [],
                    "color": null,
                    "parentModel": "workspace",
                    "parentId": null
                }, {
                    "model": "environment",
                    "id": "ev_2",
                    "createdAt": "2026-04-26T00:00:00",
                    "updatedAt": "2026-04-26T00:00:00",
                    "workspaceId": "wk_1",
                    "name": "Local",
                    "variables": [],
                    "color": null,
                    "parentModel": "environment",
                    "parentId": "ev_1"
                }],
                "folders": [],
                "httpRequests": [{
                    "model": "http_request",
                    "id": "rq_1",
                    "createdAt": "2026-04-26T00:00:00",
                    "updatedAt": "2026-04-26T00:00:00",
                    "workspaceId": "wk_1",
                    "folderId": null,
                    "authentication": {},
                    "authenticationType": null,
                    "body": { "text": "{}" },
                    "bodyType": "application/json",
                    "description": "",
                    "headers": [],
                    "method": "POST",
                    "name": "Create",
                    "sortPriority": 0,
                    "url": "https://api.example.com/users",
                    "urlParameters": []
                }],
                "grpcRequests": [],
                "websocketRequests": []
            }
        })
        .to_string();

        let result = import_yakumo(&content).unwrap().unwrap();
        let resources = result.resources.unwrap();
        assert_eq!(resources.workspaces.len(), 1);
        assert_eq!(resources.environments.len(), 2);
        assert_eq!(resources.environments[1].parent_id.as_deref(), Some("ev_1"));
        assert_eq!(resources.http_requests.len(), 1);
    }
}
