//! Actions modules for Yakumo API.
//!
//! This module provides built-in action functionality.

pub mod copy_curl;
pub mod copy_grpcurl;

use serde::Serialize;

use yakumo_models::models::{GrpcRequest, HttpRequest};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionDefinition {
    pub label: String,
    pub icon: Option<String>,
}

/// Copy request as curl command.
pub fn copy_as_curl(request: &HttpRequest) -> String {
    copy_curl::request_to_curl(request)
}

/// Copy gRPC request as grpcurl command.
pub fn copy_as_grpcurl(request: &GrpcRequest) -> String {
    copy_grpcurl::request_to_grpcurl(request)
}

pub fn http_request_actions() -> Vec<ActionDefinition> {
    vec![ActionDefinition { label: "Copy as curl".to_string(), icon: Some("copy".to_string()) }]
}

pub fn grpc_request_actions() -> Vec<ActionDefinition> {
    vec![ActionDefinition { label: "Copy as grpcurl".to_string(), icon: Some("copy".to_string()) }]
}

pub fn websocket_request_actions() -> Vec<ActionDefinition> {
    vec![ActionDefinition { label: "Copy URL".to_string(), icon: Some("copy".to_string()) }]
}

pub fn workspace_actions() -> Vec<ActionDefinition> {
    vec![ActionDefinition {
        label: "Copy Workspace ID".to_string(),
        icon: Some("copy".to_string()),
    }]
}

pub fn folder_actions() -> Vec<ActionDefinition> {
    vec![
        ActionDefinition {
            label: "Send All".to_string(),
            icon: Some("send_horizontal".to_string()),
        },
        ActionDefinition { label: "Copy Folder ID".to_string(), icon: Some("copy".to_string()) },
    ]
}
