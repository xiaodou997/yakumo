use crate::error::{Error, Result};
use crate::path_guard;
use chrono::Utc;
use serde::Serialize;
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet};
use std::fs::File;
use std::path::{Path, PathBuf};
use std::sync::{
    Arc, Mutex,
    atomic::{AtomicBool, Ordering},
};
use tauri::{AppHandle, Emitter, Manager, Runtime, State};
use yaku_domain::{
    BodyStorageKind, CreateEnvironment, CreateFolder, CreateRequest, CreateRun, CreateWorkspace,
    FinishRun, MoveRequestNode, Page, Protocol, Request, Run, RunBody, RunEvent, RunEventKind,
    RunState, Setting, UpdateEnvironment, UpdateFolder, UpdateRequest, Workspace,
};
use yaku_engine::{
    GrpcEngine, HttpEngine, ReflectionGrpcSender, ReqwestHttpSender, ReqwestSseSender, SendGrpc,
    SendHttp, SendSse, SendWebSocket, SseEngine, ThresholdBodyStore, TungsteniteWebSocketSender,
    WebSocketEngine, render_config,
};
use yaku_store::{
    BackupManifest, RequestNodePageItem, RunPageItem, Store, WorkspaceBackup, WorkspacePageItem,
};

const DEFAULT_PAGE_LIMIT: u32 = 100;
const YAKU_RUN_LIFECYCLE_EVENT: &str = "yaku_run_lifecycle";

#[derive(Clone, Default)]
pub(crate) struct YakuRunRegistry {
    runs: Arc<Mutex<BTreeMap<String, Arc<YakuRunTask>>>>,
}

#[derive(Default)]
struct YakuRunTask {
    cancelled: AtomicBool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum YakuRunLifecycleKind {
    Started,
    Finished,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct YakuRunLifecycleEvent {
    kind: YakuRunLifecycleKind,
    run_id: String,
    request_id: String,
    workspace_id: String,
    run: Option<Run>,
    error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct YakuBackupImportResponse {
    workspace: Workspace,
    manifest: BackupManifest,
    replaced_existing: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteResponse {
    deleted: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    body_gc: Option<GcReport>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GcReport {
    deleted: u64,
    retained: u64,
    bytes_deleted: u64,
    dry_run: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PageResponse<T> {
    items: Vec<T>,
    next_cursor: Option<i64>,
}

trait CursorValue {
    fn cursor(&self) -> i64;
}

impl CursorValue for WorkspacePageItem {
    fn cursor(&self) -> i64 {
        self.cursor
    }
}

impl CursorValue for RequestNodePageItem {
    fn cursor(&self) -> i64 {
        self.cursor
    }
}

impl CursorValue for RunPageItem {
    fn cursor(&self) -> i64 {
        self.cursor
    }
}

impl CursorValue for RunEvent {
    fn cursor(&self) -> i64 {
        self.id
    }
}

fn page_response<T>(items: Vec<T>) -> PageResponse<T>
where
    T: Serialize + CursorValue,
{
    let next_cursor = items.last().map(CursorValue::cursor);
    PageResponse { items, next_cursor }
}

impl YakuRunRegistry {
    fn insert(&self, run_id: String, task: Arc<YakuRunTask>) -> Result<()> {
        self.runs
            .lock()
            .map_err(|_| Error::GenericError("Yaku run registry lock poisoned".to_string()))?
            .insert(run_id, task);
        Ok(())
    }

    fn get(&self, run_id: &str) -> Result<Option<Arc<YakuRunTask>>> {
        Ok(self
            .runs
            .lock()
            .map_err(|_| Error::GenericError("Yaku run registry lock poisoned".to_string()))?
            .get(run_id)
            .cloned())
    }

    fn remove(&self, run_id: &str) {
        if let Ok(mut runs) = self.runs.lock() {
            runs.remove(run_id);
        }
    }
}

fn app_data_dir<R: Runtime>(app_handle: &AppHandle<R>) -> Result<PathBuf> {
    Ok(app_handle.path().app_data_dir()?)
}

fn open_store_from_dir(data_dir: &Path) -> Result<Store> {
    std::fs::create_dir_all(data_dir)?;
    Store::open(data_dir.join("yaku.sqlite"))
        .map_err(|e| Error::GenericError(format!("Failed to open Yaku store: {e}")))
}

fn open_store<R: Runtime>(app_handle: &AppHandle<R>) -> Result<Store> {
    let data_dir = app_data_dir(app_handle)?;
    open_store_from_dir(&data_dir)
}

fn bodies_dir(data_dir: &Path) -> PathBuf {
    data_dir.join("yaku-bodies")
}

fn page(cursor: Option<i64>, limit: Option<u32>) -> Page {
    Page { cursor, limit: limit.unwrap_or(DEFAULT_PAGE_LIMIT) }
}

fn prefixed_id(prefix: &str) -> String {
    let suffix = uuid::Uuid::new_v4().simple().to_string();
    format!("{prefix}_{suffix}")
}

fn default_sort_key() -> String {
    Utc::now().timestamp_millis().to_string()
}

fn load_environment_variables(
    store: &Store,
    environment_id: &str,
) -> std::result::Result<BTreeMap<String, serde_json::Value>, String> {
    let environment = store
        .get_environment(environment_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Environment '{environment_id}' not found"))?;
    Ok(environment.variables)
}

fn workspace_run_retention(store: &Store, workspace_id: &str) -> Result<Option<u32>> {
    let Some(setting) = store
        .get_setting(&workspace_run_retention_key(workspace_id))
        .map_err(|e| Error::GenericError(e.to_string()))?
    else {
        return Ok(None);
    };
    let keep_last = setting.value.as_u64().ok_or_else(|| {
        Error::GenericError(format!("Invalid run retention setting for workspace '{workspace_id}'"))
    })?;
    u32::try_from(keep_last).map(Some).map_err(|_| {
        Error::GenericError(format!(
            "Run retention setting for workspace '{workspace_id}' is too large"
        ))
    })
}

fn workspace_run_retention_key(workspace_id: &str) -> String {
    format!("yaku.runRetention.workspace.{workspace_id}.keepLast")
}

fn auto_prune_workspace_runs(store: &Store, workspace_id: &str, bodies_dir: &Path) -> Result<()> {
    let Some(keep_last) = workspace_run_retention(store, workspace_id)? else {
        return Ok(());
    };
    store
        .prune_runs_for_workspace(workspace_id, keep_last)
        .map_err(|e| Error::GenericError(e.to_string()))?;
    gc_body_files(store, bodies_dir, false)?;
    Ok(())
}

fn gc_body_files(store: &Store, bodies_dir: &Path, dry_run: bool) -> Result<GcReport> {
    let referenced = referenced_body_files(store)?;
    let mut report = GcReport { deleted: 0, retained: 0, bytes_deleted: 0, dry_run };

    if !bodies_dir.exists() {
        return Ok(report);
    }

    let entries = std::fs::read_dir(bodies_dir)?;
    for entry in entries {
        let entry = entry?;
        let path = entry.path();
        let metadata = entry.metadata()?;
        if !metadata.is_file() {
            continue;
        }

        let canonical = path.canonicalize()?;
        if referenced.contains(&canonical) {
            report.retained += 1;
            continue;
        }

        report.deleted += 1;
        report.bytes_deleted += metadata.len();
        if !dry_run {
            std::fs::remove_file(&path)?;
        }
    }

    Ok(report)
}

fn referenced_body_files(store: &Store) -> Result<BTreeSet<PathBuf>> {
    let mut referenced = BTreeSet::new();
    let bodies = store.list_all_run_bodies().map_err(|e| Error::GenericError(e.to_string()))?;
    for body in bodies {
        if body.storage_kind != BodyStorageKind::File {
            continue;
        }
        let Some(path) = body.storage_ref.strip_prefix("file:") else {
            continue;
        };
        let path = PathBuf::from(path);
        if path.exists() {
            referenced.insert(path.canonicalize()?);
        }
    }
    Ok(referenced)
}

fn read_body_bytes(storage_ref: &str) -> std::result::Result<Vec<u8>, String> {
    if let Some(text) = storage_ref.strip_prefix("inline:hex:") {
        return decode_hex(text);
    }
    if let Some(text) = storage_ref.strip_prefix("inline:") {
        return Ok(text.as_bytes().to_vec());
    }
    if let Some(path) = storage_ref.strip_prefix("file:") {
        return std::fs::read(path).map_err(|e| format!("Failed to read body file {path}: {e}"));
    }
    Err(format!("Unsupported Yaku body storage ref '{storage_ref}'"))
}

fn decode_hex(input: &str) -> std::result::Result<Vec<u8>, String> {
    if input.len() % 2 != 0 {
        return Err("Invalid hex body ref: odd number of digits".to_string());
    }
    (0..input.len())
        .step_by(2)
        .map(|index| {
            u8::from_str_radix(&input[index..index + 2], 16)
                .map_err(|e| format!("Invalid hex body ref: {e}"))
        })
        .collect()
}

fn send_request_inner(
    data_dir: PathBuf,
    run_id: String,
    request_id: String,
    environment_id: Option<String>,
) -> Result<Run> {
    let store = open_store_from_dir(&data_dir)?;
    let service = yaku_domain::DomainService::new(store);
    let request = service
        .repository()
        .get_request(&request_id)
        .map_err(|e| Error::GenericError(e.to_string()))?
        .ok_or_else(|| Error::GenericError(format!("Request '{request_id}' not found")))?;

    let config_override = match environment_id.as_deref() {
        Some(environment_id) => Some(
            render_config(
                request.config.clone(),
                &load_environment_variables(service.repository(), environment_id)
                    .map_err(Error::GenericError)?,
            )
            .map_err(|e| Error::GenericError(e.to_string()))?,
        ),
        None => None,
    };

    let bodies_dir = bodies_dir(&data_dir);

    let run = match request.protocol {
        Protocol::Http | Protocol::Graphql => {
            let engine = HttpEngine::with_body_store(
                ReqwestHttpSender::new().map_err(|e| Error::GenericError(e.to_string()))?,
                ThresholdBodyStore::new(bodies_dir.clone(), 64 * 1024),
            );
            engine
                .send(&service, SendHttp { run_id, request_id, config_override })
                .map_err(|e| Error::GenericError(e.to_string()))
        }
        Protocol::Sse => {
            let engine = SseEngine::new(
                ReqwestSseSender::new().map_err(|e| Error::GenericError(e.to_string()))?,
            );
            engine
                .send(&service, SendSse { run_id, request_id, config_override })
                .map_err(|e| Error::GenericError(e.to_string()))
        }
        Protocol::WebSocket => {
            let engine = WebSocketEngine::new(
                TungsteniteWebSocketSender::new()
                    .map_err(|e| Error::GenericError(e.to_string()))?,
            );
            engine
                .send(&service, SendWebSocket { run_id, request_id, config_override })
                .map_err(|e| Error::GenericError(e.to_string()))
        }
        Protocol::Grpc => {
            let engine = GrpcEngine::new(
                ReflectionGrpcSender::new().map_err(|e| Error::GenericError(e.to_string()))?,
            );
            engine
                .send(&service, SendGrpc { run_id, request_id, config_override })
                .map_err(|e| Error::GenericError(e.to_string()))
        }
    }?;
    auto_prune_workspace_runs(service.repository(), &request.workspace_id, &bodies_dir)?;
    Ok(run)
}

fn emit_run_lifecycle<R: Runtime>(
    app_handle: &AppHandle<R>,
    kind: YakuRunLifecycleKind,
    run: Option<Run>,
    run_id: String,
    request_id: String,
    workspace_id: String,
    error: Option<String>,
) {
    if let Err(err) = app_handle.emit(
        YAKU_RUN_LIFECYCLE_EVENT,
        YakuRunLifecycleEvent { kind, run_id, request_id, workspace_id, run, error },
    ) {
        log::warn!("Failed to emit Yaku run lifecycle event: {err}");
    }
}

fn get_run_from_dir(data_dir: &Path, run_id: &str) -> Result<Option<Run>> {
    let store = open_store_from_dir(data_dir)?;
    store.get_run(run_id).map_err(|e| Error::GenericError(e.to_string()))
}

fn finish_run_if_running(
    data_dir: &Path,
    run_id: &str,
    state: RunState,
    status_code: Option<i32>,
    error: Option<String>,
) -> Result<Option<Run>> {
    let store = open_store_from_dir(data_dir)?;
    let service = yaku_domain::DomainService::new(store);
    let Some(run) =
        service.repository().get_run(run_id).map_err(|e| Error::GenericError(e.to_string()))?
    else {
        return Ok(None);
    };
    if run.state != RunState::Running {
        return Ok(Some(run));
    }
    service
        .finish_run(FinishRun {
            run_id: run_id.to_string(),
            state,
            status_code,
            error,
            now: Utc::now(),
        })
        .map(Some)
        .map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_workspace_list<R: Runtime>(
    app_handle: AppHandle<R>,
    cursor: Option<i64>,
    limit: Option<u32>,
) -> Result<PageResponse<WorkspacePageItem>> {
    let store = open_store(&app_handle)?;
    let items = store
        .list_workspace_page(page(cursor, limit))
        .map_err(|e| Error::GenericError(e.to_string()))?;
    Ok(page_response(items))
}

#[tauri::command]
pub(crate) fn cmd_yaku_workspace_get<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: String,
) -> Result<Option<Workspace>> {
    let store = open_store(&app_handle)?;
    store.get_workspace(&workspace_id).map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_workspace_create<R: Runtime>(
    app_handle: AppHandle<R>,
    name: String,
    description: Option<String>,
) -> Result<Workspace> {
    let store = open_store(&app_handle)?;
    let service = yaku_domain::DomainService::new(store);
    service
        .create_workspace(CreateWorkspace {
            id: prefixed_id("wk"),
            name,
            description: description.unwrap_or_default(),
            now: Utc::now(),
        })
        .map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_workspace_delete<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: String,
) -> Result<DeleteResponse> {
    let data_dir = app_data_dir(&app_handle)?;
    let store = open_store_from_dir(&data_dir)?;
    let service = yaku_domain::DomainService::new(store);
    service.delete_workspace(&workspace_id).map_err(|e| Error::GenericError(e.to_string()))?;
    let body_gc = gc_body_files(service.repository(), &bodies_dir(&data_dir), false)?;
    Ok(DeleteResponse { deleted: true, body_gc: Some(body_gc) })
}

#[tauri::command]
pub(crate) fn cmd_yaku_environment_list<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: String,
) -> Result<Vec<yaku_domain::Environment>> {
    let store = open_store(&app_handle)?;
    store.list_environments(&workspace_id).map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_environment_get<R: Runtime>(
    app_handle: AppHandle<R>,
    environment_id: String,
) -> Result<Option<yaku_domain::Environment>> {
    let store = open_store(&app_handle)?;
    store.get_environment(&environment_id).map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_environment_create<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: String,
    name: String,
    variables: BTreeMap<String, Value>,
) -> Result<yaku_domain::Environment> {
    let store = open_store(&app_handle)?;
    let service = yaku_domain::DomainService::new(store);
    service
        .create_environment(CreateEnvironment {
            id: prefixed_id("env"),
            workspace_id,
            name,
            variables,
            now: Utc::now(),
        })
        .map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_environment_update<R: Runtime>(
    app_handle: AppHandle<R>,
    environment_id: String,
    name: Option<String>,
    variables: Option<BTreeMap<String, Value>>,
) -> Result<yaku_domain::Environment> {
    let store = open_store(&app_handle)?;
    let service = yaku_domain::DomainService::new(store);
    service
        .update_environment(UpdateEnvironment {
            id: environment_id,
            name,
            variables,
            now: Utc::now(),
        })
        .map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_environment_delete<R: Runtime>(
    app_handle: AppHandle<R>,
    environment_id: String,
) -> Result<DeleteResponse> {
    let store = open_store(&app_handle)?;
    let service = yaku_domain::DomainService::new(store);
    service.delete_environment(&environment_id).map_err(|e| Error::GenericError(e.to_string()))?;
    Ok(DeleteResponse { deleted: true, body_gc: None })
}

#[tauri::command]
pub(crate) fn cmd_yaku_request_list<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: String,
    cursor: Option<i64>,
    limit: Option<u32>,
) -> Result<PageResponse<RequestNodePageItem>> {
    let store = open_store(&app_handle)?;
    let items = store
        .list_request_node_page(&workspace_id, page(cursor, limit))
        .map_err(|e| Error::GenericError(e.to_string()))?;
    Ok(page_response(items))
}

#[tauri::command]
pub(crate) fn cmd_yaku_request_get<R: Runtime>(
    app_handle: AppHandle<R>,
    request_id: String,
) -> Result<Option<Request>> {
    let store = open_store(&app_handle)?;
    store.get_request(&request_id).map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_request_node_get<R: Runtime>(
    app_handle: AppHandle<R>,
    node_id: String,
) -> Result<Option<yaku_domain::RequestNode>> {
    let store = open_store(&app_handle)?;
    store.get_request_node(&node_id).map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_folder_create<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: String,
    name: String,
    parent_id: Option<String>,
    sort_key: Option<String>,
) -> Result<yaku_domain::RequestNode> {
    let store = open_store(&app_handle)?;
    let service = yaku_domain::DomainService::new(store);
    service
        .create_folder(CreateFolder {
            id: prefixed_id("folder"),
            workspace_id,
            parent_id,
            name,
            sort_key: sort_key.unwrap_or_else(default_sort_key),
            now: Utc::now(),
        })
        .map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_folder_update<R: Runtime>(
    app_handle: AppHandle<R>,
    folder_id: String,
    name: Option<String>,
) -> Result<yaku_domain::RequestNode> {
    let store = open_store(&app_handle)?;
    let service = yaku_domain::DomainService::new(store);
    service
        .update_folder(UpdateFolder { id: folder_id, name, now: Utc::now() })
        .map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_request_create<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: String,
    name: String,
    protocol: Protocol,
    config: BTreeMap<String, Value>,
    parent_id: Option<String>,
    sort_key: Option<String>,
    description: Option<String>,
) -> Result<Request> {
    let store = open_store(&app_handle)?;
    let service = yaku_domain::DomainService::new(store);
    service
        .create_request(CreateRequest {
            id: prefixed_id("rq"),
            node_id: prefixed_id("node"),
            workspace_id,
            parent_id,
            protocol,
            name,
            description: description.unwrap_or_default(),
            config,
            sort_key: sort_key.unwrap_or_else(default_sort_key),
            now: Utc::now(),
        })
        .map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_request_update<R: Runtime>(
    app_handle: AppHandle<R>,
    request_id: String,
    name: Option<String>,
    description: Option<String>,
    config: Option<BTreeMap<String, Value>>,
) -> Result<Request> {
    let store = open_store(&app_handle)?;
    let service = yaku_domain::DomainService::new(store);
    service
        .update_request(UpdateRequest {
            id: request_id,
            name,
            description,
            config,
            now: Utc::now(),
        })
        .map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_request_node_move<R: Runtime>(
    app_handle: AppHandle<R>,
    node_id: String,
    parent_id: Option<String>,
    sort_key: Option<String>,
) -> Result<yaku_domain::RequestNode> {
    let store = open_store(&app_handle)?;
    let service = yaku_domain::DomainService::new(store);
    service
        .move_request_node(MoveRequestNode {
            id: node_id,
            parent_id,
            sort_key: sort_key.unwrap_or_else(default_sort_key),
            now: Utc::now(),
        })
        .map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_request_node_delete<R: Runtime>(
    app_handle: AppHandle<R>,
    node_id: String,
) -> Result<DeleteResponse> {
    let data_dir = app_data_dir(&app_handle)?;
    let store = open_store_from_dir(&data_dir)?;
    let service = yaku_domain::DomainService::new(store);
    service.delete_request_node(&node_id).map_err(|e| Error::GenericError(e.to_string()))?;
    let body_gc = gc_body_files(service.repository(), &bodies_dir(&data_dir), false)?;
    Ok(DeleteResponse { deleted: true, body_gc: Some(body_gc) })
}

#[tauri::command]
pub(crate) fn cmd_yaku_run_list<R: Runtime>(
    app_handle: AppHandle<R>,
    request_id: Option<String>,
    workspace_id: Option<String>,
    cursor: Option<i64>,
    limit: Option<u32>,
) -> Result<PageResponse<RunPageItem>> {
    let store = open_store(&app_handle)?;
    let items = match (request_id.as_deref(), workspace_id.as_deref()) {
        (Some(request_id), None) => {
            store.list_run_page_for_request(request_id, page(cursor, limit))
        }
        (None, Some(workspace_id)) => {
            store.list_run_page_for_workspace(workspace_id, page(cursor, limit))
        }
        _ => {
            return Err(Error::GenericError(
                "Exactly one of requestId or workspaceId must be provided".to_string(),
            ));
        }
    }
    .map_err(|e| Error::GenericError(e.to_string()))?;

    Ok(page_response(items))
}

#[tauri::command]
pub(crate) fn cmd_yaku_run_get<R: Runtime>(
    app_handle: AppHandle<R>,
    run_id: String,
) -> Result<Option<Run>> {
    let store = open_store(&app_handle)?;
    store.get_run(&run_id).map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_run_events<R: Runtime>(
    app_handle: AppHandle<R>,
    run_id: String,
    kind: Option<RunEventKind>,
    cursor: Option<i64>,
    limit: Option<u32>,
) -> Result<PageResponse<RunEvent>> {
    let store = open_store(&app_handle)?;
    let items = match kind {
        Some(kind) => store.list_run_events_by_kind(&run_id, kind, page(cursor, limit)),
        None => store.list_run_events(&run_id, page(cursor, limit)),
    }
    .map_err(|e| Error::GenericError(e.to_string()))?;

    Ok(page_response(items))
}

#[tauri::command]
pub(crate) fn cmd_yaku_run_bodies<R: Runtime>(
    app_handle: AppHandle<R>,
    run_id: String,
) -> Result<Vec<RunBody>> {
    let store = open_store(&app_handle)?;
    store.list_run_bodies(&run_id).map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_run_body_bytes<R: Runtime>(
    app_handle: AppHandle<R>,
    body_id: String,
) -> Result<Vec<u8>> {
    let store = open_store(&app_handle)?;
    let body = store
        .get_run_body(&body_id)
        .map_err(|e| Error::GenericError(e.to_string()))?
        .ok_or_else(|| Error::GenericError(format!("Run body '{body_id}' not found")))?;

    read_body_bytes(&body.storage_ref).map_err(Error::GenericError)
}

#[tauri::command]
pub(crate) fn cmd_yaku_run_delete<R: Runtime>(
    app_handle: AppHandle<R>,
    run_id: String,
) -> Result<DeleteResponse> {
    let data_dir = app_data_dir(&app_handle)?;
    let store = open_store_from_dir(&data_dir)?;
    let deleted = store.delete_run(&run_id).map_err(|e| Error::GenericError(e.to_string()))?;
    if !deleted {
        return Err(Error::GenericError(format!("Run '{run_id}' not found")));
    }
    let body_gc = gc_body_files(&store, &bodies_dir(&data_dir), false)?;
    Ok(DeleteResponse { deleted: true, body_gc: Some(body_gc) })
}

#[tauri::command]
pub(crate) fn cmd_yaku_run_prune<R: Runtime>(
    app_handle: AppHandle<R>,
    request_id: Option<String>,
    workspace_id: Option<String>,
    keep_last: u32,
) -> Result<GcReport> {
    let data_dir = app_data_dir(&app_handle)?;
    let store = open_store_from_dir(&data_dir)?;
    match (request_id, workspace_id) {
        (Some(request_id), None) => store
            .prune_runs_for_request(&request_id, keep_last)
            .map_err(|e| Error::GenericError(e.to_string()))?,
        (None, Some(workspace_id)) => store
            .prune_runs_for_workspace(&workspace_id, keep_last)
            .map_err(|e| Error::GenericError(e.to_string()))?,
        _ => {
            return Err(Error::GenericError(
                "Exactly one of requestId or workspaceId must be provided".to_string(),
            ));
        }
    };
    gc_body_files(&store, &bodies_dir(&data_dir), false)
}

#[tauri::command]
pub(crate) fn cmd_yaku_run_retention_get<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: String,
) -> Result<Option<u32>> {
    let store = open_store(&app_handle)?;
    workspace_run_retention(&store, &workspace_id)
}

#[tauri::command]
pub(crate) fn cmd_yaku_run_retention_set<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: String,
    keep_last: u32,
) -> Result<Setting> {
    let store = open_store(&app_handle)?;
    let setting = Setting {
        key: workspace_run_retention_key(&workspace_id),
        value: json!(keep_last),
        updated_at: Utc::now(),
    };
    store.upsert_setting(&setting).map_err(|e| Error::GenericError(e.to_string()))?;
    Ok(setting)
}

#[tauri::command]
pub(crate) fn cmd_yaku_run_retention_clear<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: String,
) -> Result<DeleteResponse> {
    let store = open_store(&app_handle)?;
    let deleted = store
        .delete_setting(&workspace_run_retention_key(&workspace_id))
        .map_err(|e| Error::GenericError(e.to_string()))?;
    Ok(DeleteResponse { deleted, body_gc: None })
}

#[tauri::command]
pub(crate) fn cmd_yaku_setting_get<R: Runtime>(
    app_handle: AppHandle<R>,
    key: String,
) -> Result<Option<Setting>> {
    let store = open_store(&app_handle)?;
    store.get_setting(&key).map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_setting_set<R: Runtime>(
    app_handle: AppHandle<R>,
    key: String,
    value: Value,
) -> Result<Setting> {
    let store = open_store(&app_handle)?;
    let setting = Setting { key, value, updated_at: Utc::now() };
    store.upsert_setting(&setting).map_err(|e| Error::GenericError(e.to_string()))?;
    Ok(setting)
}

#[tauri::command]
pub(crate) fn cmd_yaku_backup_export<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: String,
    export_path: String,
) -> Result<BackupManifest> {
    path_guard::writable_parent(&PathBuf::from(&export_path), "Yaku backup export path")?;
    let store = open_store(&app_handle)?;
    let backup = store
        .export_workspace_backup(&workspace_id)
        .map_err(|e| Error::GenericError(e.to_string()))?;
    let f = File::options()
        .create(true)
        .truncate(true)
        .write(true)
        .open(&export_path)
        .map_err(|e| Error::GenericError(format!("Unable to create Yaku backup: {e}")))?;
    serde_json::to_writer_pretty(&f, &backup)
        .map_err(|e| Error::GenericError(format!("Failed to write Yaku backup: {e}")))?;
    f.sync_all().map_err(|e| Error::GenericError(format!("Failed to sync Yaku backup: {e}")))?;

    let manifest = BackupManifest {
        id: prefixed_id("backup"),
        workspace_id: Some(backup.workspace.id),
        content_hash: backup.content_hash,
        created_at: Utc::now(),
        metadata: BTreeMap::from([
            ("path".to_string(), json!(export_path)),
            ("operation".to_string(), json!("export")),
        ]),
    };
    store.upsert_backup_manifest(&manifest).map_err(|e| Error::GenericError(e.to_string()))?;
    Ok(manifest)
}

#[tauri::command]
pub(crate) fn cmd_yaku_backup_import<R: Runtime>(
    app_handle: AppHandle<R>,
    file_path: String,
    replace_existing: bool,
) -> Result<YakuBackupImportResponse> {
    path_guard::existing_file(&PathBuf::from(&file_path), "Yaku backup import path")?;
    let store = open_store(&app_handle)?;
    let f = File::open(&file_path)
        .map_err(|e| Error::GenericError(format!("Unable to open Yaku backup: {e}")))?;
    let backup: WorkspaceBackup = serde_json::from_reader(f)
        .map_err(|e| Error::GenericError(format!("Unable to parse Yaku backup: {e}")))?;
    store.verify_workspace_backup(&backup).map_err(|e| Error::GenericError(e.to_string()))?;
    let workspace = backup.workspace.clone();
    let content_hash = backup.content_hash.clone();
    let replaced_existing = store
        .import_workspace_backup(&backup, replace_existing)
        .map_err(|e| Error::GenericError(e.to_string()))?;

    let manifest = BackupManifest {
        id: prefixed_id("backup"),
        workspace_id: Some(workspace.id.clone()),
        content_hash,
        created_at: Utc::now(),
        metadata: BTreeMap::from([
            ("path".to_string(), json!(file_path)),
            ("operation".to_string(), json!("import")),
            ("replacedExisting".to_string(), json!(replaced_existing)),
        ]),
    };
    store.upsert_backup_manifest(&manifest).map_err(|e| Error::GenericError(e.to_string()))?;
    Ok(YakuBackupImportResponse { workspace, manifest, replaced_existing })
}

#[tauri::command]
pub(crate) fn cmd_yaku_gc_bodies<R: Runtime>(
    app_handle: AppHandle<R>,
    dry_run: Option<bool>,
) -> Result<GcReport> {
    let data_dir = app_data_dir(&app_handle)?;
    let store = open_store_from_dir(&data_dir)?;
    gc_body_files(&store, &bodies_dir(&data_dir), dry_run.unwrap_or(false))
}

#[tauri::command]
pub(crate) fn cmd_yaku_run_start<R: Runtime>(
    app_handle: AppHandle<R>,
    registry: State<'_, YakuRunRegistry>,
    request_id: String,
    environment_id: Option<String>,
) -> Result<Run> {
    let data_dir = app_data_dir(&app_handle)?;
    let store = open_store_from_dir(&data_dir)?;
    let service = yaku_domain::DomainService::new(store);
    let request = service
        .repository()
        .get_request(&request_id)
        .map_err(|e| Error::GenericError(e.to_string()))?
        .ok_or_else(|| Error::GenericError(format!("Request '{request_id}' not found")))?;
    let run = service
        .create_run(CreateRun {
            id: prefixed_id("run"),
            request_id: request.id.clone(),
            now: Utc::now(),
        })
        .map_err(|e| Error::GenericError(e.to_string()))?;

    let task = Arc::new(YakuRunTask::default());
    registry.insert(run.id.clone(), task.clone())?;
    emit_run_lifecycle(
        &app_handle,
        YakuRunLifecycleKind::Started,
        Some(run.clone()),
        run.id.clone(),
        run.request_id.clone(),
        run.workspace_id.clone(),
        None,
    );

    let app_handle_local = app_handle.clone();
    let registry_local = registry.inner().clone();
    let run_id = run.id.clone();
    let request_id = run.request_id.clone();
    let workspace_id = run.workspace_id.clone();
    std::thread::spawn(move || {
        let result = send_request_inner(
            data_dir.clone(),
            run_id.clone(),
            request_id.clone(),
            environment_id,
        );
        let current_run = get_run_from_dir(&data_dir, &run_id).ok().flatten();
        let is_cancelled = task.cancelled.load(Ordering::SeqCst)
            || current_run.as_ref().is_some_and(|run| run.state == RunState::Cancelled);

        if is_cancelled {
            emit_run_lifecycle(
                &app_handle_local,
                YakuRunLifecycleKind::Cancelled,
                current_run,
                run_id.clone(),
                request_id.clone(),
                workspace_id.clone(),
                None,
            );
            registry_local.remove(&run_id);
            return;
        }

        match result {
            Ok(run) if run.state == RunState::Failed => {
                emit_run_lifecycle(
                    &app_handle_local,
                    YakuRunLifecycleKind::Failed,
                    Some(run.clone()),
                    run.id.clone(),
                    run.request_id.clone(),
                    run.workspace_id.clone(),
                    run.error.clone(),
                );
            }
            Ok(run) => {
                emit_run_lifecycle(
                    &app_handle_local,
                    YakuRunLifecycleKind::Finished,
                    Some(run.clone()),
                    run.id.clone(),
                    run.request_id.clone(),
                    run.workspace_id.clone(),
                    None,
                );
            }
            Err(err) => {
                let error = err.to_string();
                let failed_run = finish_run_if_running(
                    &data_dir,
                    &run_id,
                    RunState::Failed,
                    None,
                    Some(error.clone()),
                )
                .ok()
                .flatten();
                emit_run_lifecycle(
                    &app_handle_local,
                    YakuRunLifecycleKind::Failed,
                    failed_run,
                    run_id.clone(),
                    request_id.clone(),
                    workspace_id.clone(),
                    Some(error),
                );
            }
        }

        registry_local.remove(&run_id);
    });

    Ok(run)
}

#[tauri::command]
pub(crate) fn cmd_yaku_run_cancel<R: Runtime>(
    app_handle: AppHandle<R>,
    registry: State<'_, YakuRunRegistry>,
    run_id: String,
) -> Result<Run> {
    if let Some(task) = registry.get(&run_id)? {
        task.cancelled.store(true, Ordering::SeqCst);
    }

    let data_dir = app_data_dir(&app_handle)?;
    let run = finish_run_if_running(&data_dir, &run_id, RunState::Cancelled, None, None)?
        .ok_or_else(|| Error::GenericError(format!("Run '{run_id}' not found")))?;
    if run.state == RunState::Cancelled {
        emit_run_lifecycle(
            &app_handle,
            YakuRunLifecycleKind::Cancelled,
            Some(run.clone()),
            run.id.clone(),
            run.request_id.clone(),
            run.workspace_id.clone(),
            None,
        );
    }
    Ok(run)
}

#[tauri::command]
pub(crate) async fn cmd_yaku_send_request<R: Runtime>(
    app_handle: AppHandle<R>,
    request_id: String,
    environment_id: Option<String>,
) -> Result<Run> {
    let data_dir = app_data_dir(&app_handle)?;
    let run_id = prefixed_id("run");
    tauri::async_runtime::spawn_blocking(move || {
        send_request_inner(data_dir, run_id, request_id, environment_id)
    })
    .await
    .map_err(|e| Error::GenericError(format!("Yaku send failed to join blocking task: {e}")))?
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn reads_inline_utf8_body() {
        let body = read_body_bytes("inline:{\"ok\":true}").expect("inline body");
        assert_eq!(body, br#"{"ok":true}"#);
    }

    #[test]
    fn reads_inline_hex_body() {
        let body = read_body_bytes("inline:hex:00ff10").expect("inline hex body");
        assert_eq!(body, vec![0, 255, 16]);
    }

    #[test]
    fn reads_file_body() {
        let path =
            std::env::temp_dir().join(format!("yaku-body-{}.bin", Utc::now().timestamp_millis()));
        std::fs::write(&path, b"payload").expect("write body file");
        let body = read_body_bytes(&format!("file:{}", path.display())).expect("file body");
        assert_eq!(body, b"payload");
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn rejects_invalid_hex_body() {
        let err = read_body_bytes("inline:hex:0").expect_err("invalid hex");
        assert!(err.contains("odd number of digits"));
    }

    #[test]
    fn page_response_uses_last_cursor() {
        let response = page_response(vec![
            WorkspacePageItem {
                cursor: 1,
                workspace: Workspace {
                    id: "wk_1".to_string(),
                    name: "One".to_string(),
                    description: String::new(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
            },
            WorkspacePageItem {
                cursor: 2,
                workspace: Workspace {
                    id: "wk_2".to_string(),
                    name: "Two".to_string(),
                    description: String::new(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
            },
        ]);

        assert_eq!(response.next_cursor, Some(2));
        assert_eq!(response.items.len(), 2);
    }
}
