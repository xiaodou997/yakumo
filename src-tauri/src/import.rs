use crate::error::Result;
use crate::models_ext::QueryManagerExt;
use log::info;
use std::collections::BTreeMap;
use std::fs::read_to_string;
use tauri::{Runtime, WebviewWindow};
use yakumo_core::WorkspaceContext;
use yakumo_features::importer;
use yakumo_models::models::{
    Environment, Folder, GrpcRequest, HttpRequest, WebsocketRequest, Workspace,
};
use yakumo_models::util::{BatchUpsertResult, UpdateSource, maybe_gen_id, maybe_gen_id_opt};
use yakumo_tauri_utils::window::WorkspaceWindowTrait;

pub(crate) async fn import_data<R: Runtime>(
    window: &WebviewWindow<R>,
    file_path: &str,
) -> Result<BatchUpsertResult> {
    let file = read_to_string(file_path).map_err(|e| {
        crate::error::Error::GenericError(format!("Unable to read import file: {e}"))
    })?;
    let file_contents = file.as_str();

    // Use built-in importer
    let import_response = import_with_builtin_importer(file_contents)?;

    // Extract resources from ImportResponse
    let resources = match import_response.resources {
        Some(r) => r,
        None => {
            return Err(crate::error::Error::GenericError(
                "No resources found in import data".to_string(),
            ));
        }
    };

    let mut id_map: BTreeMap<String, String> = BTreeMap::new();

    // Create WorkspaceContext from window
    let ctx = WorkspaceContext {
        workspace_id: window.workspace_id(),
        environment_id: window.environment_id(),
        cookie_jar_id: window.cookie_jar_id(),
        request_id: None,
    };

    let workspaces: Vec<Workspace> = match resources.workspace {
        Some(mut w) => {
            w.id = maybe_gen_id::<Workspace>(&ctx, w.id.as_str(), &mut id_map);
            vec![w]
        }
        None => vec![],
    };

    let environments: Vec<Environment> = match resources.environment {
        Some(mut v) => {
            v.id = maybe_gen_id::<Environment>(&ctx, v.id.as_str(), &mut id_map);
            v.workspace_id = maybe_gen_id::<Workspace>(&ctx, v.workspace_id.as_str(), &mut id_map);
            match (v.parent_model.as_str(), v.parent_id.clone()) {
                ("folder", Some(parent_id)) => {
                    v.parent_id = Some(maybe_gen_id::<Folder>(&ctx, &parent_id, &mut id_map));
                }
                ("", _) | (_, None) => {
                    // Fix any empty ones
                    v.parent_model = "workspace".to_string();
                    v.parent_id = None;
                }
                _ => {
                    // Parent ID only required for the folder case
                    v.parent_id = None;
                }
            };
            vec![v]
        }
        None => vec![],
    };

    let folders: Vec<Folder> = resources
        .folders
        .into_iter()
        .map(|mut v| {
            v.id = maybe_gen_id::<Folder>(&ctx, v.id.as_str(), &mut id_map);
            v.workspace_id = maybe_gen_id::<Workspace>(&ctx, v.workspace_id.as_str(), &mut id_map);
            v.folder_id = maybe_gen_id_opt::<Folder>(&ctx, v.folder_id, &mut id_map);
            v
        })
        .collect();

    let http_requests: Vec<HttpRequest> = resources
        .http_requests
        .into_iter()
        .map(|mut v| {
            v.id = maybe_gen_id::<HttpRequest>(&ctx, v.id.as_str(), &mut id_map);
            v.workspace_id = maybe_gen_id::<Workspace>(&ctx, v.workspace_id.as_str(), &mut id_map);
            v.folder_id = maybe_gen_id_opt::<Folder>(&ctx, v.folder_id, &mut id_map);
            v
        })
        .collect();

    let grpc_requests: Vec<GrpcRequest> = resources
        .grpc_requests
        .into_iter()
        .map(|mut v| {
            v.id = maybe_gen_id::<GrpcRequest>(&ctx, v.id.as_str(), &mut id_map);
            v.workspace_id = maybe_gen_id::<Workspace>(&ctx, v.workspace_id.as_str(), &mut id_map);
            v.folder_id = maybe_gen_id_opt::<Folder>(&ctx, v.folder_id, &mut id_map);
            v
        })
        .collect();

    let websocket_requests: Vec<WebsocketRequest> = resources
        .websocket_requests
        .into_iter()
        .map(|mut v| {
            v.id = maybe_gen_id::<WebsocketRequest>(&ctx, v.id.as_str(), &mut id_map);
            v.workspace_id = maybe_gen_id::<Workspace>(&ctx, v.workspace_id.as_str(), &mut id_map);
            v.folder_id = maybe_gen_id_opt::<Folder>(&ctx, v.folder_id, &mut id_map);
            v
        })
        .collect();

    info!("Importing data");

    let upserted = window.with_tx(|tx| {
        tx.batch_upsert(
            workspaces,
            environments,
            folders,
            http_requests,
            grpc_requests,
            websocket_requests,
            &UpdateSource::Import,
        )
    })?;

    Ok(upserted)
}

/// Import data using built-in importer
fn import_with_builtin_importer(content: &str) -> Result<yakumo_features::events::ImportResponse> {
    let result = importer::import(content).map_err(crate::error::Error::GenericError)?;
    Ok(result.unwrap_or_else(|| yakumo_features::events::ImportResponse {
        resources: None,
        error: Some("No supported import data found".to_string()),
    }))
}
