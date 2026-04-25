//! Actions modules for Yakumo API.
//!
//! This module provides built-in action functionality
//! that were previously implemented as plugins.

pub mod copy_curl;
pub mod copy_grpcurl;

// TODO: Implement these modules
// pub mod send_folder;

use yakumo_models::models::{GrpcRequest, HttpRequest};

/// Copy request as curl command.
pub fn copy_as_curl(request: &HttpRequest) -> String {
    copy_curl::request_to_curl(request)
}

/// Copy gRPC request as grpcurl command.
pub fn copy_as_grpcurl(request: &GrpcRequest) -> String {
    copy_grpcurl::request_to_grpcurl(request)
}
