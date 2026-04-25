use std::collections::BTreeMap;

use crate::error::Result;
use crate::models_ext::QueryManagerExt;
use KeyAndValueRef::{Ascii, Binary};
use tauri::{Manager, Runtime, WebviewWindow};
use yaak_features::auth;
use yaak_grpc::{KeyAndValueRef, MetadataMap};
use yaak_models::models::GrpcRequest;

pub(crate) fn metadata_to_map(metadata: MetadataMap) -> BTreeMap<String, String> {
    let mut entries = BTreeMap::new();
    for r in metadata.iter() {
        match r {
            Ascii(k, v) => entries.insert(k.to_string(), v.to_str().unwrap().to_string()),
            Binary(k, v) => entries.insert(k.to_string(), format!("{:?}", v)),
        };
    }
    entries
}

pub(crate) fn resolve_grpc_request<R: Runtime>(
    window: &WebviewWindow<R>,
    request: &GrpcRequest,
) -> Result<(GrpcRequest, String)> {
    let mut new_request = request.clone();

    let (authentication_type, authentication, authentication_context_id) =
        window.db().resolve_auth_for_grpc_request(request)?;
    new_request.authentication_type = authentication_type;
    new_request.authentication = authentication;

    let metadata = window.db().resolve_metadata_for_grpc_request(request)?;
    new_request.metadata = metadata;

    Ok((new_request, authentication_context_id))
}

pub(crate) async fn build_metadata<R: Runtime>(
    _window: &WebviewWindow<R>,
    request: &GrpcRequest,
    _authentication_context_id: &str,
) -> Result<BTreeMap<String, String>> {
    let mut metadata = BTreeMap::new();

    // Add the rest of metadata
    for h in request.metadata.clone() {
        if h.name.is_empty() && h.value.is_empty() {
            continue;
        }

        if !h.enabled {
            continue;
        }

        metadata.insert(h.name, h.value);
    }

    // Handle built-in authentication types
    match request.authentication_type.clone() {
        None => {
            // No authentication found. Not even inherited
        }
        Some(authentication_type) if authentication_type == "none" => {
            // Explicitly no authentication
        }
        Some(authentication_type) => {
            // Convert BTreeMap to HashMap for auth module
            let auth_values: std::collections::HashMap<String, serde_json::Value> =
                request.authentication.iter().map(|(k, v)| (k.clone(), v.clone())).collect();

            // Use built-in authentication handlers
            let auth_result = auth::apply_auth(&authentication_type, &auth_values);

            // Add headers from auth result
            for header in auth_result.headers {
                metadata.insert(header.name, header.value);
            }

            // Add query params if needed (not typically used for gRPC)
        }
    }

    Ok(metadata)
}
