use crate::error::Error::GenericError;
use crate::error::Result;
use crate::import::import_data;
use crate::models_ext::BlobManagerExt;
use crate::models_ext::QueryManagerExt;
use crate::path_guard;
use eventsource_client::{EventParser, SSE};
use std::fs;
use std::fs::File;
use std::path::PathBuf;
use tauri::{AppHandle, Runtime, WebviewWindow, command};
use yakumo_models::models::HttpResponseEvent;
use yakumo_models::util::{BatchUpsertResult, get_workspace_export_resources};
use yakumo_sse::sse::ServerSentEvent;

#[command]
pub(crate) async fn cmd_http_response_body_bytes<R: Runtime>(
    app_handle: AppHandle<R>,
    response_id: &str,
) -> Result<Option<Vec<u8>>> {
    let response = app_handle.db().get_http_response(response_id)?;
    let Some(body_path) = response.body_path else {
        return Ok(None);
    };

    Ok(Some(read_body_bytes(&app_handle, &body_path)?))
}

#[command]
pub(crate) async fn cmd_directory_is_empty(path: &str) -> Result<bool> {
    let path = PathBuf::from(path);
    path_guard::existing_dir(&path, "Directory")?;
    Ok(fs::read_dir(path)?.next().is_none())
}

#[command]
pub(crate) async fn cmd_get_sse_events<R: Runtime>(
    app_handle: AppHandle<R>,
    response_id: &str,
) -> Result<Vec<ServerSentEvent>> {
    let response = app_handle.db().get_http_response(response_id)?;
    let Some(body_path) = response.body_path else {
        return Ok(Vec::new());
    };
    let body = read_body_bytes(&app_handle, &body_path)?;
    parse_sse_events(body)
}

fn parse_sse_events(body: Vec<u8>) -> Result<Vec<ServerSentEvent>> {
    let mut event_parser = EventParser::new();
    event_parser.process_bytes(body.into())?;

    let mut events = Vec::new();
    while let Some(e) = event_parser.get_event() {
        if let SSE::Event(e) = e {
            events.push(ServerSentEvent {
                event_type: e.event_type,
                data: e.data,
                id: e.id,
                retry: e.retry,
            });
        }
    }

    Ok(events)
}

#[command]
pub(crate) async fn cmd_get_http_response_events<R: Runtime>(
    app_handle: AppHandle<R>,
    response_id: &str,
) -> Result<Vec<HttpResponseEvent>> {
    let events: Vec<HttpResponseEvent> = app_handle.db().list_http_response_events(response_id)?;
    Ok(events)
}

#[command]
pub(crate) async fn cmd_import_data<R: Runtime>(
    window: WebviewWindow<R>,
    file_path: &str,
) -> Result<BatchUpsertResult> {
    path_guard::existing_file(&PathBuf::from(file_path), "Import path")?;
    import_data(&window, file_path).await
}

#[command]
pub(crate) async fn cmd_export_data<R: Runtime>(
    app_handle: AppHandle<R>,
    export_path: &str,
    workspace_ids: Vec<&str>,
    include_private_environments: bool,
) -> Result<()> {
    path_guard::writable_parent(&PathBuf::from(export_path), "Export path")?;
    let db = app_handle.db();
    let version = app_handle.package_info().version.to_string();
    let export_data =
        get_workspace_export_resources(&db, &version, workspace_ids, include_private_environments)?;
    let f = File::options()
        .create(true)
        .truncate(true)
        .write(true)
        .open(export_path)
        .map_err(|e| GenericError(format!("Unable to create export file: {e}")))?;

    serde_json::to_writer_pretty(&f, &export_data)
        .map_err(|e| GenericError(format!("Failed to write export file: {e}")))?;

    f.sync_all().map_err(|e| GenericError(format!("Failed to sync export file: {e}")))?;

    Ok(())
}

#[command]
pub(crate) async fn cmd_save_response<R: Runtime>(
    app_handle: AppHandle<R>,
    response_id: &str,
    filepath: &str,
) -> Result<()> {
    path_guard::writable_parent(&PathBuf::from(filepath), "Response save path")?;
    let response = app_handle.db().get_http_response(response_id)?;

    let body_path =
        response.body_path.ok_or(GenericError("Response does not have a body".to_string()))?;
    let body = read_body_bytes(&app_handle, &body_path)?;
    fs::write(filepath, body).map_err(|e| GenericError(format!("Failed to save response: {e}")))?;

    Ok(())
}

pub(crate) fn read_body_bytes<R: Runtime>(
    app_handle: &AppHandle<R>,
    body_path: &str,
) -> Result<Vec<u8>> {
    if let Ok(body) = fs::read(body_path) {
        return Ok(body);
    }

    let chunks = app_handle.blobs().get_chunks(body_path)?;
    if chunks.is_empty() {
        return Err(GenericError(format!("Response body not found: {body_path}")));
    }

    Ok(chunks.into_iter().flat_map(|chunk| chunk.data).collect())
}

#[cfg(test)]
mod tests {
    use super::parse_sse_events;

    #[test]
    fn parses_server_sent_events_from_response_body() {
        let events = parse_sse_events(
            b"id: evt_1\nevent: message\ndata: {\"ok\":true}\nretry: 5000\n\n".to_vec(),
        )
        .expect("SSE response should parse");

        assert_eq!(events.len(), 1);
        assert_eq!(events[0].id.as_deref(), Some("evt_1"));
        assert_eq!(events[0].event_type, "message");
        assert_eq!(events[0].data, "{\"ok\":true}");
        assert_eq!(events[0].retry, Some(5000));
    }
}
