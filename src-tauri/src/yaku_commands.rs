use crate::error::{Error, Result};
use crate::path_guard;
use chrono::Utc;
use serde::Serialize;
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet};
use std::fs::File;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, Runtime, State};
use yaku_domain::{
    BodyStorageKind, CookieJar, CookieRecord, CreateEnvironment, CreateFolder, CreateRequest,
    CreateRun, CreateWorkspace, FinishRun, MoveRequestNode, Page, Protocol, Request, Run, RunBody,
    RunEvent, RunEventKind, RunState, SecretMetadata, Setting, UpdateEnvironment, UpdateFolder,
    UpdateRequest, Workspace,
};
use yaku_engine::{
    CancellationToken, GrpcEngine, HttpEngine, ReflectionGrpcSender, ReqwestHttpSender,
    ReqwestSseSender, SendGrpc, SendHttp, SendSse, SendWebSocket, SseEngine, ThresholdBodyStore,
    TungsteniteWebSocketSender, WebSocketEngine, render_config,
};
use yaku_store::{
    BackupManifest, RequestNodePageItem, RunPageItem, Store, WorkspaceBackup, WorkspacePageItem,
};

const DEFAULT_PAGE_LIMIT: u32 = 100;
const YAKU_RUN_LIFECYCLE_EVENT: &str = "yaku_run_lifecycle";
#[cfg(not(test))]
const YAKU_KEYRING_SERVICE: &str = "yaku.secrets";
const SECRET_STORAGE_KEYCHAIN: &str = "os_keychain";
const SECRET_STORAGE_BACKUP_PLAINTEXT: &str = "backup_plaintext";
#[cfg(test)]
const SECRET_STORAGE_LOCAL_PLAINTEXT: &str = "local_plaintext";

#[derive(Clone, Default)]
pub(crate) struct YakuRunRegistry {
    runs: Arc<Mutex<BTreeMap<String, Arc<YakuRunTask>>>>,
}

struct YakuRunTask {
    cancellation: CancellationToken,
}

impl Default for YakuRunTask {
    fn default() -> Self {
        Self { cancellation: CancellationToken::new() }
    }
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretAuditReference {
    request_id: String,
    request_name: String,
    node_id: String,
    node_path: String,
    auth_type: String,
    auth_field: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretAuditItem {
    secret: SecretMetadata,
    kind: Option<String>,
    storage: Option<String>,
    orphan: bool,
    references: Vec<SecretAuditReference>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretAuditResponse {
    items: Vec<SecretAuditItem>,
    orphan_count: usize,
    referenced_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretCleanupResponse {
    deleted_ids: Vec<String>,
    deleted_count: usize,
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

fn protect_request_config_secrets(
    store: &Store,
    workspace_id: &str,
    request_name: &str,
    mut config: BTreeMap<String, Value>,
) -> Result<BTreeMap<String, Value>> {
    let Some(Value::Object(auth)) = config.get_mut("auth") else {
        return Ok(config);
    };
    let auth_type =
        auth.get("type").and_then(Value::as_str).unwrap_or("none").trim().to_ascii_lowercase();
    match auth_type.as_str() {
        "" | "none" => {}
        "basic" => {
            if let Some(password) = auth.get("password").and_then(Value::as_str) {
                if !password.is_empty() && password != "<redacted>" {
                    let secret = upsert_request_secret(
                        store,
                        workspace_id,
                        request_name,
                        "http_basic_password",
                        "HTTP basic password",
                        password,
                    )?;
                    auth.insert("passwordSecretId".to_string(), json!(secret.id));
                }
                auth.remove("password");
            }
        }
        "bearer" => {
            if let Some(token) = auth.get("token").and_then(Value::as_str) {
                if !token.is_empty() && token != "<redacted>" {
                    let secret = upsert_request_secret(
                        store,
                        workspace_id,
                        request_name,
                        "http_bearer_token",
                        "HTTP bearer token",
                        token,
                    )?;
                    auth.insert("tokenSecretId".to_string(), json!(secret.id));
                }
                auth.remove("token");
            }
        }
        _ => {}
    }
    Ok(config)
}

fn upsert_request_secret(
    store: &Store,
    workspace_id: &str,
    request_name: &str,
    kind: &str,
    label: &str,
    value: &str,
) -> Result<SecretMetadata> {
    let now = Utc::now();
    let id = prefixed_id("sec");
    let (ciphertext, storage) = store_secret_value(&id, value)?;
    let secret = SecretMetadata {
        id,
        workspace_id: workspace_id.to_string(),
        name: format!("{request_name} {label}"),
        ciphertext,
        metadata: BTreeMap::from([
            ("kind".to_string(), json!(kind)),
            ("storage".to_string(), json!(storage)),
        ]),
        created_at: now,
        updated_at: now,
    };
    store.upsert_secret_metadata(&secret).map_err(|e| Error::GenericError(e.to_string()))?;
    Ok(secret)
}

#[cfg(not(test))]
fn store_secret_value(secret_id: &str, value: &str) -> Result<(String, &'static str)> {
    let entry = keyring::Entry::new(YAKU_KEYRING_SERVICE, secret_id)
        .map_err(|e| Error::GenericError(format!("Failed to open OS keychain entry: {e}")))?;
    entry
        .set_password(value)
        .map_err(|e| Error::GenericError(format!("Failed to write OS keychain secret: {e}")))?;
    Ok((format!("keyring:{YAKU_KEYRING_SERVICE}:{secret_id}"), SECRET_STORAGE_KEYCHAIN))
}

#[cfg(test)]
fn store_secret_value(_secret_id: &str, value: &str) -> Result<(String, &'static str)> {
    Ok((value.to_string(), SECRET_STORAGE_LOCAL_PLAINTEXT))
}

fn read_secret_value(secret: &SecretMetadata) -> Result<String> {
    let storage = secret.metadata.get("storage").and_then(Value::as_str).unwrap_or("");
    if storage == SECRET_STORAGE_KEYCHAIN || secret.ciphertext.starts_with("keyring:") {
        return read_keyring_secret(&secret.id);
    }
    Ok(secret.ciphertext.clone())
}

#[cfg(not(test))]
fn read_keyring_secret(secret_id: &str) -> Result<String> {
    let entry = keyring::Entry::new(YAKU_KEYRING_SERVICE, secret_id)
        .map_err(|e| Error::GenericError(format!("Failed to open OS keychain entry: {e}")))?;
    entry
        .get_password()
        .map_err(|e| Error::GenericError(format!("Failed to read OS keychain secret: {e}")))
}

#[cfg(test)]
fn read_keyring_secret(secret_id: &str) -> Result<String> {
    Err(Error::GenericError(format!(
        "Test keyring secret '{secret_id}' should not be read from OS keychain"
    )))
}

fn delete_secret_value(secret: &SecretMetadata) -> Result<()> {
    let storage = secret.metadata.get("storage").and_then(Value::as_str).unwrap_or("");
    if storage == SECRET_STORAGE_KEYCHAIN || secret.ciphertext.starts_with("keyring:") {
        delete_keyring_secret(&secret.id)?;
    }
    Ok(())
}

fn hydrate_backup_secrets_for_export(backup: &mut WorkspaceBackup) -> Result<()> {
    for secret in &mut backup.secrets {
        let value = read_secret_value(secret)?;
        secret.ciphertext = value;
        secret.metadata.insert("storage".to_string(), json!(SECRET_STORAGE_BACKUP_PLAINTEXT));
    }
    backup.content_hash = String::new();
    backup.content_hash = yaku_store::compute_workspace_backup_content_hash(backup)
        .map_err(|e| Error::GenericError(e.to_string()))?;
    Ok(())
}

fn protect_backup_secrets_for_import(backup: &mut WorkspaceBackup) -> Result<()> {
    for secret in &mut backup.secrets {
        let value = backup_plaintext_secret_value(secret)?;
        let (ciphertext, storage) = store_secret_value(&secret.id, &value)?;
        secret.ciphertext = ciphertext;
        secret.metadata.insert("storage".to_string(), json!(storage));
    }
    backup.content_hash = String::new();
    backup.content_hash = yaku_store::compute_workspace_backup_content_hash(backup)
        .map_err(|e| Error::GenericError(e.to_string()))?;
    Ok(())
}

fn backup_plaintext_secret_value(secret: &SecretMetadata) -> Result<String> {
    let storage = secret.metadata.get("storage").and_then(Value::as_str).unwrap_or("");
    if storage == SECRET_STORAGE_KEYCHAIN || secret.ciphertext.starts_with("keyring:") {
        return Err(Error::GenericError(format!(
            "Yaku backup secret '{}' does not contain portable plaintext secret data",
            secret.id
        )));
    }
    Ok(secret.ciphertext.clone())
}

#[cfg(not(test))]
fn delete_keyring_secret(secret_id: &str) -> Result<()> {
    let entry = keyring::Entry::new(YAKU_KEYRING_SERVICE, secret_id)
        .map_err(|e| Error::GenericError(format!("Failed to open OS keychain entry: {e}")))?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(err) => Err(Error::GenericError(format!("Failed to delete OS keychain secret: {err}"))),
    }
}

#[cfg(test)]
fn delete_keyring_secret(_secret_id: &str) -> Result<()> {
    Ok(())
}

fn resolve_request_config_secrets(
    store: &Store,
    mut config: BTreeMap<String, Value>,
) -> Result<BTreeMap<String, Value>> {
    let Some(Value::Object(auth)) = config.get_mut("auth") else {
        return Ok(config);
    };
    if auth.get("password").is_none() {
        if let Some(secret_id) = auth.get("passwordSecretId").and_then(Value::as_str) {
            let secret = store
                .get_secret_metadata(secret_id)
                .map_err(|e| Error::GenericError(e.to_string()))?
                .ok_or_else(|| Error::GenericError(format!("Secret '{secret_id}' not found")))?;
            auth.insert("password".to_string(), json!(read_secret_value(&secret)?));
        }
    }
    if auth.get("token").is_none() {
        if let Some(secret_id) = auth.get("tokenSecretId").and_then(Value::as_str) {
            let secret = store
                .get_secret_metadata(secret_id)
                .map_err(|e| Error::GenericError(e.to_string()))?
                .ok_or_else(|| Error::GenericError(format!("Secret '{secret_id}' not found")))?;
            auth.insert("token".to_string(), json!(read_secret_value(&secret)?));
        }
    }
    Ok(config)
}

fn validate_http_body_files(config: &BTreeMap<String, Value>) -> Result<()> {
    let body_mode = config.get("bodyMode").and_then(Value::as_str).unwrap_or("text");
    if body_mode.trim().eq_ignore_ascii_case("file") {
        let file_path = config.get("bodyFilePath").and_then(Value::as_str).ok_or_else(|| {
            Error::GenericError("File body mode requires bodyFilePath".to_string())
        })?;
        return path_guard::existing_file(&PathBuf::from(file_path), "Yaku request body file");
    }
    if body_mode.trim().eq_ignore_ascii_case("multipart") {
        let Some(parts) = config.get("multipartParts").and_then(Value::as_array) else {
            return Ok(());
        };
        for part in parts {
            let enabled = part.get("enabled").and_then(Value::as_bool).unwrap_or(true);
            let kind = part.get("kind").and_then(Value::as_str).unwrap_or("text");
            if !enabled || !kind.trim().eq_ignore_ascii_case("file") {
                continue;
            }
            let name = part.get("name").and_then(Value::as_str).unwrap_or("unnamed");
            let file_path = part.get("filePath").and_then(Value::as_str).ok_or_else(|| {
                Error::GenericError(format!("Multipart file part '{name}' requires filePath"))
            })?;
            path_guard::existing_file(
                &PathBuf::from(file_path),
                &format!("Yaku multipart file part '{name}'"),
            )?;
        }
    }
    Ok(())
}

fn collect_auth_secret_ids(config: &BTreeMap<String, Value>) -> Vec<String> {
    collect_auth_secret_refs(config).into_iter().map(|reference| reference.secret_id).collect()
}

#[derive(Debug, Clone)]
struct AuthSecretRef {
    secret_id: String,
    auth_type: String,
    auth_field: String,
}

fn collect_auth_secret_refs(config: &BTreeMap<String, Value>) -> Vec<AuthSecretRef> {
    let Some(Value::Object(auth)) = config.get("auth") else {
        return Vec::new();
    };
    let auth_type = auth.get("type").and_then(Value::as_str).unwrap_or("unknown").to_string();
    let mut refs = Vec::new();
    if let Some(secret_id) = auth.get("passwordSecretId").and_then(Value::as_str) {
        refs.push(AuthSecretRef {
            secret_id: secret_id.to_string(),
            auth_type: auth_type.clone(),
            auth_field: "password".to_string(),
        });
    }
    if let Some(secret_id) = auth.get("tokenSecretId").and_then(Value::as_str) {
        refs.push(AuthSecretRef {
            secret_id: secret_id.to_string(),
            auth_type,
            auth_field: "token".to_string(),
        });
    }
    refs
}

fn cleanup_secret_ids(store: &Store, secret_ids: impl IntoIterator<Item = String>) -> Result<()> {
    for secret_id in secret_ids {
        cleanup_request_secret_ref(store, &secret_id)?;
    }
    Ok(())
}

#[cfg(test)]
fn cleanup_request_secret_refs(store: &Store, config: &BTreeMap<String, Value>) -> Result<()> {
    cleanup_secret_ids(store, collect_auth_secret_ids(config))
}

fn cleanup_request_secret_ref(store: &Store, secret_id: &str) -> Result<()> {
    if let Some(secret) =
        store.get_secret_metadata(secret_id).map_err(|e| Error::GenericError(e.to_string()))?
    {
        delete_secret_value(&secret)?;
    }
    store.delete_secret_metadata(secret_id).map_err(|e| Error::GenericError(e.to_string()))?;
    Ok(())
}

fn collect_request_node_subtree_secret_ids(store: &Store, node_id: &str) -> Result<Vec<String>> {
    let Some(root) =
        store.get_request_node(node_id).map_err(|e| Error::GenericError(e.to_string()))?
    else {
        return Ok(Vec::new());
    };
    let tree = store
        .list_request_tree(&root.workspace_id)
        .map_err(|e| Error::GenericError(e.to_string()))?;
    let mut subtree_node_ids = BTreeSet::from([node_id.to_string()]);
    let mut changed = true;
    while changed {
        changed = false;
        for node in &tree {
            if let Some(parent_id) = &node.parent_id {
                if subtree_node_ids.contains(parent_id) && subtree_node_ids.insert(node.id.clone())
                {
                    changed = true;
                }
            }
        }
    }
    let mut secret_ids = BTreeSet::new();
    for node in tree {
        if !subtree_node_ids.contains(&node.id) {
            continue;
        }
        let Some(request_id) = node.request_id else {
            continue;
        };
        if let Some(request) =
            store.get_request(&request_id).map_err(|e| Error::GenericError(e.to_string()))?
        {
            for secret_id in collect_auth_secret_ids(&request.config) {
                secret_ids.insert(secret_id);
            }
        }
    }
    Ok(secret_ids.into_iter().collect())
}

fn list_workspace_secret_audit(store: &Store, workspace_id: &str) -> Result<SecretAuditResponse> {
    let mut secrets =
        store.list_secret_metadata(workspace_id).map_err(|e| Error::GenericError(e.to_string()))?;
    secrets.sort_by(|left, right| left.name.cmp(&right.name).then(left.id.cmp(&right.id)));

    let tree =
        store.list_request_tree(workspace_id).map_err(|e| Error::GenericError(e.to_string()))?;
    let node_by_id =
        tree.iter().cloned().map(|node| (node.id.clone(), node)).collect::<BTreeMap<_, _>>();
    let request_node_by_request_id = tree
        .iter()
        .filter_map(|node| {
            node.request_id.as_ref().map(|request_id| (request_id.clone(), node.clone()))
        })
        .collect::<BTreeMap<_, _>>();

    let mut refs_by_secret_id = BTreeMap::<String, Vec<SecretAuditReference>>::new();
    for (request_id, node) in request_node_by_request_id {
        let Some(request) =
            store.get_request(&request_id).map_err(|e| Error::GenericError(e.to_string()))?
        else {
            continue;
        };
        for secret_ref in collect_auth_secret_refs(&request.config) {
            refs_by_secret_id.entry(secret_ref.secret_id).or_default().push(SecretAuditReference {
                request_id: request.id.clone(),
                request_name: request.name.clone(),
                node_id: node.id.clone(),
                node_path: request_node_path(&node.id, &node_by_id),
                auth_type: secret_ref.auth_type,
                auth_field: secret_ref.auth_field,
            });
        }
    }

    let items = secrets
        .into_iter()
        .map(|secret| {
            let mut references = refs_by_secret_id.remove(&secret.id).unwrap_or_default();
            references.sort_by(|left, right| left.node_path.cmp(&right.node_path));
            let kind = secret.metadata.get("kind").and_then(Value::as_str).map(str::to_string);
            let storage =
                secret.metadata.get("storage").and_then(Value::as_str).map(str::to_string);
            SecretAuditItem { secret, kind, storage, orphan: references.is_empty(), references }
        })
        .collect::<Vec<_>>();

    let orphan_count = items.iter().filter(|item| item.orphan).count();
    let referenced_count = items.len().saturating_sub(orphan_count);

    Ok(SecretAuditResponse { items, orphan_count, referenced_count })
}

fn delete_orphan_secret(store: &Store, secret_id: &str) -> Result<bool> {
    let Some(secret) =
        store.get_secret_metadata(secret_id).map_err(|e| Error::GenericError(e.to_string()))?
    else {
        return Ok(false);
    };
    let audit = list_workspace_secret_audit(store, &secret.workspace_id)?;
    let item =
        audit.items.into_iter().find(|item| item.secret.id == secret_id).ok_or_else(|| {
            Error::GenericError(format!("Secret '{secret_id}' not found in audit"))
        })?;
    if !item.orphan {
        return Err(Error::GenericError(format!(
            "Secret '{secret_id}' is still referenced by {} request(s)",
            item.references.len()
        )));
    }
    delete_secret_value(&secret)?;
    store.delete_secret_metadata(secret_id).map_err(|e| Error::GenericError(e.to_string()))
}

fn delete_workspace_orphan_secrets(
    store: &Store,
    workspace_id: &str,
) -> Result<SecretCleanupResponse> {
    let audit = list_workspace_secret_audit(store, workspace_id)?;
    let mut deleted_ids = Vec::new();
    for item in audit.items.into_iter().filter(|item| item.orphan) {
        if delete_orphan_secret(store, &item.secret.id)? {
            deleted_ids.push(item.secret.id);
        }
    }
    let deleted_count = deleted_ids.len();
    Ok(SecretCleanupResponse { deleted_ids, deleted_count })
}

fn request_node_path(
    node_id: &str,
    node_by_id: &BTreeMap<String, yaku_domain::RequestNode>,
) -> String {
    let mut names = Vec::new();
    let mut current = node_by_id.get(node_id);
    while let Some(node) = current {
        names.push(node.name.clone());
        current = node.parent_id.as_ref().and_then(|parent_id| node_by_id.get(parent_id));
    }
    names.reverse();
    names.join(" / ")
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
    cancellation: Option<CancellationToken>,
) -> Result<Run> {
    let store = open_store_from_dir(&data_dir)?;
    let service = yaku_domain::DomainService::new(store);
    let request = service
        .repository()
        .get_request(&request_id)
        .map_err(|e| Error::GenericError(e.to_string()))?
        .ok_or_else(|| Error::GenericError(format!("Request '{request_id}' not found")))?;

    let rendered_config = match environment_id.as_deref() {
        Some(environment_id) => render_config(
            request.config.clone(),
            &load_environment_variables(service.repository(), environment_id)
                .map_err(Error::GenericError)?,
        )
        .map_err(|e| Error::GenericError(e.to_string()))?,
        None => request.config.clone(),
    };
    let config_override = {
        let config = resolve_request_config_secrets(service.repository(), rendered_config)?;
        if matches!(request.protocol, Protocol::Http | Protocol::Graphql) {
            validate_http_body_files(&config)?;
        }
        Some(config)
    };

    let bodies_dir = bodies_dir(&data_dir);
    let cancellation = cancellation.unwrap_or_else(CancellationToken::new);

    let run = match request.protocol {
        Protocol::Http | Protocol::Graphql => {
            let engine = HttpEngine::with_body_store(
                ReqwestHttpSender::new().map_err(|e| Error::GenericError(e.to_string()))?,
                ThresholdBodyStore::new(bodies_dir.clone(), 64 * 1024),
            );
            engine
                .send_with_cancellation(
                    &service,
                    SendHttp { run_id, request_id, config_override },
                    cancellation,
                )
                .map_err(|e| Error::GenericError(e.to_string()))
        }
        Protocol::Sse => {
            let engine = SseEngine::new(
                ReqwestSseSender::new().map_err(|e| Error::GenericError(e.to_string()))?,
            );
            engine
                .send_with_cancellation(
                    &service,
                    SendSse { run_id, request_id, config_override },
                    cancellation,
                )
                .map_err(|e| Error::GenericError(e.to_string()))
        }
        Protocol::WebSocket => {
            let engine = WebSocketEngine::new(
                TungsteniteWebSocketSender::new()
                    .map_err(|e| Error::GenericError(e.to_string()))?,
            );
            engine
                .send_with_cancellation(
                    &service,
                    SendWebSocket { run_id, request_id, config_override },
                    cancellation,
                )
                .map_err(|e| Error::GenericError(e.to_string()))
        }
        Protocol::Grpc => {
            let engine = GrpcEngine::new(
                ReflectionGrpcSender::new().map_err(|e| Error::GenericError(e.to_string()))?,
            );
            engine
                .send_with_cancellation(
                    &service,
                    SendGrpc { run_id, request_id, config_override },
                    cancellation,
                )
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

pub(crate) fn cancel_running_runs_on_startup<R: Runtime>(app_handle: &AppHandle<R>) -> Result<u64> {
    let data_dir = app_data_dir(app_handle)?;
    let store = open_store_from_dir(&data_dir)?;
    let service = yaku_domain::DomainService::new(store);
    let running_runs = service
        .repository()
        .list_runs_by_state(RunState::Running)
        .map_err(|e| Error::GenericError(e.to_string()))?;
    let mut cancelled = 0;
    for run in running_runs {
        service
            .finish_run(FinishRun {
                run_id: run.id,
                state: RunState::Cancelled,
                status_code: None,
                error: Some("Run was cancelled during app startup cleanup".to_string()),
                now: Utc::now(),
            })
            .map_err(|e| Error::GenericError(e.to_string()))?;
        cancelled += 1;
    }
    Ok(cancelled)
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
pub(crate) fn cmd_yaku_cookie_jar_list<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: String,
) -> Result<Vec<CookieJar>> {
    let store = open_store(&app_handle)?;
    store.list_cookie_jars(&workspace_id).map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_cookie_jar_create<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: String,
    name: String,
) -> Result<CookieJar> {
    let store = open_store(&app_handle)?;
    if store.get_workspace(&workspace_id).map_err(|e| Error::GenericError(e.to_string()))?.is_none()
    {
        return Err(Error::GenericError(format!("Workspace '{workspace_id}' not found")));
    }
    let name = name.trim();
    if name.is_empty() {
        return Err(Error::GenericError("Cookie jar name cannot be empty".to_string()));
    }
    let now = Utc::now();
    let jar = CookieJar {
        id: prefixed_id("jar"),
        workspace_id,
        name: name.to_string(),
        created_at: now,
        updated_at: now,
    };
    store.upsert_cookie_jar(&jar).map_err(|e| Error::GenericError(e.to_string()))?;
    Ok(jar)
}

#[tauri::command]
pub(crate) fn cmd_yaku_cookie_jar_delete<R: Runtime>(
    app_handle: AppHandle<R>,
    jar_id: String,
) -> Result<DeleteResponse> {
    let store = open_store(&app_handle)?;
    let deleted =
        store.delete_cookie_jar(&jar_id).map_err(|e| Error::GenericError(e.to_string()))?;
    Ok(DeleteResponse { deleted, body_gc: None })
}

#[tauri::command]
pub(crate) fn cmd_yaku_cookie_list<R: Runtime>(
    app_handle: AppHandle<R>,
    jar_id: String,
) -> Result<Vec<CookieRecord>> {
    let store = open_store(&app_handle)?;
    store.list_cookies(&jar_id).map_err(|e| Error::GenericError(e.to_string()))
}

#[tauri::command]
pub(crate) fn cmd_yaku_cookie_delete<R: Runtime>(
    app_handle: AppHandle<R>,
    cookie_id: String,
) -> Result<DeleteResponse> {
    let store = open_store(&app_handle)?;
    let deleted =
        store.delete_cookie(&cookie_id).map_err(|e| Error::GenericError(e.to_string()))?;
    Ok(DeleteResponse { deleted, body_gc: None })
}

#[tauri::command]
pub(crate) fn cmd_yaku_cookie_jar_clear<R: Runtime>(
    app_handle: AppHandle<R>,
    jar_id: String,
) -> Result<DeleteResponse> {
    let store = open_store(&app_handle)?;
    let deleted =
        store.clear_cookies_for_jar(&jar_id).map_err(|e| Error::GenericError(e.to_string()))?;
    Ok(DeleteResponse { deleted: deleted > 0, body_gc: None })
}

#[tauri::command]
pub(crate) fn cmd_yaku_secret_audit<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: String,
) -> Result<SecretAuditResponse> {
    let store = open_store(&app_handle)?;
    list_workspace_secret_audit(&store, &workspace_id)
}

#[tauri::command]
pub(crate) fn cmd_yaku_secret_delete<R: Runtime>(
    app_handle: AppHandle<R>,
    secret_id: String,
) -> Result<DeleteResponse> {
    let store = open_store(&app_handle)?;
    let deleted = delete_orphan_secret(&store, &secret_id)?;
    Ok(DeleteResponse { deleted, body_gc: None })
}

#[tauri::command]
pub(crate) fn cmd_yaku_secret_orphans_delete<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: String,
) -> Result<SecretCleanupResponse> {
    let store = open_store(&app_handle)?;
    delete_workspace_orphan_secrets(&store, &workspace_id)
}

#[tauri::command]
pub(crate) async fn cmd_yaku_grpc_services(
    url: String,
    metadata: BTreeMap<String, String>,
    proto_files: Vec<String>,
    proto_import_roots: Vec<String>,
    use_reflection: bool,
) -> Result<Vec<yakumo_grpc::ServiceDefinition>> {
    let url = url.trim();
    if url.is_empty() {
        return Err(Error::GenericError("gRPC URL cannot be empty".to_string()));
    }
    let proto_file_count = proto_files.len();

    let proto_paths = if use_reflection {
        Vec::new()
    } else {
        proto_import_roots.into_iter().chain(proto_files.into_iter()).map(PathBuf::from).collect()
    };

    if !use_reflection && proto_file_count == 0 {
        return Err(Error::GenericError(
            "gRPC schema discovery requires at least one proto file when reflection is disabled"
                .to_string(),
        ));
    }

    let cache_key = format!(
        "{:x}",
        md5::compute(
            serde_json::to_vec(&(url, &metadata, &proto_paths, use_reflection))
                .map_err(|e| Error::GenericError(e.to_string()))?,
        )
    );

    let mut handle = yakumo_grpc::manager::GrpcHandle::new();
    handle
        .services(&cache_key, url, &proto_paths, &metadata, true, None)
        .await
        .map_err(|e| Error::GenericError(e.to_string()))
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
    let config =
        protect_request_config_secrets(service.repository(), &workspace_id, &name, config)?;
    let new_secret_ids = collect_auth_secret_ids(&config);
    match service.create_request(CreateRequest {
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
    }) {
        Ok(request) => Ok(request),
        Err(err) => {
            cleanup_secret_ids(service.repository(), new_secret_ids)?;
            Err(Error::GenericError(err.to_string()))
        }
    }
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
    let mut stale_new_secret_ids = Vec::new();
    let config = match config {
        Some(config) => {
            let request = service
                .repository()
                .get_request(&request_id)
                .map_err(|e| Error::GenericError(e.to_string()))?
                .ok_or_else(|| Error::GenericError(format!("Request '{request_id}' not found")))?;
            let secret_name = name.as_deref().unwrap_or(&request.name);
            let protected = protect_request_config_secrets(
                service.repository(),
                &request.workspace_id,
                secret_name,
                config,
            )?;
            stale_new_secret_ids = collect_auth_secret_ids(&protected);
            for old_id in collect_auth_secret_ids(&request.config) {
                stale_new_secret_ids.retain(|new_id| new_id != &old_id);
            }
            Some(protected)
        }
        None => None,
    };
    let previous_config = match config.as_ref() {
        Some(_) => service
            .repository()
            .get_request(&request_id)
            .map_err(|e| Error::GenericError(e.to_string()))?
            .map(|request| request.config),
        None => None,
    };
    let updated = match service.update_request(UpdateRequest {
        id: request_id,
        name,
        description,
        config,
        now: Utc::now(),
    }) {
        Ok(request) => request,
        Err(err) => {
            cleanup_secret_ids(service.repository(), stale_new_secret_ids)?;
            return Err(Error::GenericError(err.to_string()));
        }
    };
    if let Some(previous_config) = previous_config {
        let old_ids = collect_auth_secret_ids(&previous_config);
        let new_ids = collect_auth_secret_ids(&updated.config);
        for secret_id in old_ids {
            if !new_ids.contains(&secret_id) {
                if let Some(secret) = service
                    .repository()
                    .get_secret_metadata(&secret_id)
                    .map_err(|e| Error::GenericError(e.to_string()))?
                {
                    delete_secret_value(&secret)?;
                }
                service
                    .repository()
                    .delete_secret_metadata(&secret_id)
                    .map_err(|e| Error::GenericError(e.to_string()))?;
            }
        }
    }
    Ok(updated)
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
    let secret_ids = collect_request_node_subtree_secret_ids(service.repository(), &node_id)?;
    service.delete_request_node(&node_id).map_err(|e| Error::GenericError(e.to_string()))?;
    cleanup_secret_ids(service.repository(), secret_ids)?;
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
    let mut backup = store
        .export_workspace_backup(&workspace_id)
        .map_err(|e| Error::GenericError(e.to_string()))?;
    hydrate_backup_secrets_for_export(&mut backup)?;
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
    let mut backup: WorkspaceBackup = serde_json::from_reader(f)
        .map_err(|e| Error::GenericError(format!("Unable to parse Yaku backup: {e}")))?;
    store.verify_workspace_backup(&backup).map_err(|e| Error::GenericError(e.to_string()))?;
    protect_backup_secrets_for_import(&mut backup)?;
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
            Some(task.cancellation.clone()),
        );
        let current_run = get_run_from_dir(&data_dir, &run_id).ok().flatten();
        let is_cancelled = task.cancellation.is_cancelled()
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
        task.cancellation.cancel();
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
        send_request_inner(data_dir, run_id, request_id, environment_id, None)
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

    #[test]
    fn request_auth_secret_is_extracted_resolved_and_cleaned_up() {
        let store = Store::open_in_memory().expect("store opens");
        let service = yaku_domain::DomainService::new(store);
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_secret".to_string(),
                name: "Secrets".to_string(),
                description: String::new(),
                now: Utc::now(),
            })
            .expect("workspace created");
        let config = BTreeMap::from([
            ("method".to_string(), json!("GET")),
            ("url".to_string(), json!("https://example.test")),
            (
                "auth".to_string(),
                json!({
                    "type": "basic",
                    "username": "alice",
                    "password": "open-sesame",
                }),
            ),
        ]);

        let protected = protect_request_config_secrets(
            service.repository(),
            &workspace.id,
            "Private Request",
            config,
        )
        .expect("config protected");
        let auth = protected["auth"].as_object().expect("auth object");
        assert!(auth.get("password").is_none());
        let secret_id = auth["passwordSecretId"].as_str().expect("secret id");
        let secret = service
            .repository()
            .get_secret_metadata(secret_id)
            .expect("secret get")
            .expect("secret exists");
        assert_eq!(secret.ciphertext, "open-sesame");

        let resolved = resolve_request_config_secrets(service.repository(), protected.clone())
            .expect("resolved");
        assert_eq!(resolved["auth"]["password"], json!("open-sesame"));

        cleanup_request_secret_refs(service.repository(), &protected).expect("cleanup");
        assert!(
            service
                .repository()
                .get_secret_metadata(secret_id)
                .expect("secret get after cleanup")
                .is_none()
        );
    }

    #[test]
    fn secret_audit_lists_references_and_orphans() {
        let store = Store::open_in_memory().expect("store opens");
        let service = yaku_domain::DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_secret_audit".to_string(),
                name: "Secrets".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        let folder = service
            .create_folder(CreateFolder {
                id: "folder_secret_audit".to_string(),
                workspace_id: workspace.id.clone(),
                parent_id: None,
                name: "Auth".to_string(),
                sort_key: "1".to_string(),
                now,
            })
            .expect("folder create");

        let referenced_secret = SecretMetadata {
            id: "sec_referenced".to_string(),
            workspace_id: workspace.id.clone(),
            name: "Request token".to_string(),
            ciphertext: "keyring:yaku.secrets:sec_referenced".to_string(),
            metadata: BTreeMap::from([
                ("kind".to_string(), json!("http_bearer_token")),
                ("storage".to_string(), json!(SECRET_STORAGE_KEYCHAIN)),
            ]),
            created_at: now,
            updated_at: now,
        };
        service
            .repository()
            .upsert_secret_metadata(&referenced_secret)
            .expect("referenced secret upsert");

        let orphan_secret = SecretMetadata {
            id: "sec_orphan".to_string(),
            workspace_id: workspace.id.clone(),
            name: "Orphan token".to_string(),
            ciphertext: "stale".to_string(),
            metadata: BTreeMap::from([
                ("kind".to_string(), json!("http_bearer_token")),
                ("storage".to_string(), json!(SECRET_STORAGE_LOCAL_PLAINTEXT)),
            ]),
            created_at: now,
            updated_at: now,
        };
        service.repository().upsert_secret_metadata(&orphan_secret).expect("orphan secret upsert");

        service
            .create_request(CreateRequest {
                id: "rq_secret_audit".to_string(),
                node_id: "node_secret_audit".to_string(),
                workspace_id: workspace.id.clone(),
                parent_id: Some(folder.id.clone()),
                protocol: Protocol::Http,
                name: "Protected".to_string(),
                description: String::new(),
                config: BTreeMap::from([
                    ("method".to_string(), json!("GET")),
                    ("url".to_string(), json!("https://example.test")),
                    (
                        "auth".to_string(),
                        json!({
                            "type": "bearer",
                            "tokenSecretId": "sec_referenced",
                        }),
                    ),
                ]),
                sort_key: "2".to_string(),
                now,
            })
            .expect("request create");

        let audit =
            list_workspace_secret_audit(service.repository(), &workspace.id).expect("audit");
        assert_eq!(audit.items.len(), 2);
        assert_eq!(audit.orphan_count, 1);
        assert_eq!(audit.referenced_count, 1);

        let referenced = audit
            .items
            .iter()
            .find(|item| item.secret.id == "sec_referenced")
            .expect("referenced item");
        assert!(!referenced.orphan);
        assert_eq!(referenced.references.len(), 1);
        assert_eq!(referenced.references[0].request_name, "Protected");
        assert_eq!(referenced.references[0].node_path, "Auth / Protected");
        assert_eq!(referenced.references[0].auth_field, "token");

        let orphan =
            audit.items.iter().find(|item| item.secret.id == "sec_orphan").expect("orphan item");
        assert!(orphan.orphan);
        assert!(orphan.references.is_empty());
    }

    #[test]
    fn orphan_secret_can_be_deleted_but_referenced_secret_is_rejected() {
        let store = Store::open_in_memory().expect("store opens");
        let service = yaku_domain::DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_secret_delete".to_string(),
                name: "Secrets".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        let referenced_secret = SecretMetadata {
            id: "sec_referenced_delete".to_string(),
            workspace_id: workspace.id.clone(),
            name: "Referenced".to_string(),
            ciphertext: "value".to_string(),
            metadata: BTreeMap::new(),
            created_at: now,
            updated_at: now,
        };
        let orphan_secret = SecretMetadata {
            id: "sec_orphan_delete".to_string(),
            workspace_id: workspace.id.clone(),
            name: "Orphan".to_string(),
            ciphertext: "value".to_string(),
            metadata: BTreeMap::new(),
            created_at: now,
            updated_at: now,
        };
        service.repository().upsert_secret_metadata(&referenced_secret).expect("ref upsert");
        service.repository().upsert_secret_metadata(&orphan_secret).expect("orphan upsert");
        service
            .create_request(CreateRequest {
                id: "rq_secret_delete".to_string(),
                node_id: "node_secret_delete".to_string(),
                workspace_id: workspace.id.clone(),
                parent_id: None,
                protocol: Protocol::Http,
                name: "Protected".to_string(),
                description: String::new(),
                config: BTreeMap::from([
                    ("method".to_string(), json!("GET")),
                    ("url".to_string(), json!("https://example.test")),
                    (
                        "auth".to_string(),
                        json!({
                            "type": "bearer",
                            "tokenSecretId": referenced_secret.id,
                        }),
                    ),
                ]),
                sort_key: "1".to_string(),
                now,
            })
            .expect("request create");

        assert!(
            delete_orphan_secret(service.repository(), &orphan_secret.id).expect("delete orphan")
        );
        assert!(
            service
                .repository()
                .get_secret_metadata(&orphan_secret.id)
                .expect("orphan get")
                .is_none()
        );

        let err = delete_orphan_secret(service.repository(), &referenced_secret.id)
            .expect_err("referenced");
        assert!(err.to_string().contains("still referenced"));
    }

    #[test]
    fn orphan_secret_cleanup_deletes_all_orphans_in_workspace() {
        let store = Store::open_in_memory().expect("store opens");
        let service = yaku_domain::DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_secret_cleanup".to_string(),
                name: "Secrets".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        for id in ["sec_cleanup_a", "sec_cleanup_b"] {
            service
                .repository()
                .upsert_secret_metadata(&SecretMetadata {
                    id: id.to_string(),
                    workspace_id: workspace.id.clone(),
                    name: id.to_string(),
                    ciphertext: "value".to_string(),
                    metadata: BTreeMap::new(),
                    created_at: now,
                    updated_at: now,
                })
                .expect("secret upsert");
        }

        let cleanup =
            delete_workspace_orphan_secrets(service.repository(), &workspace.id).expect("cleanup");
        assert_eq!(cleanup.deleted_count, 2);
        assert_eq!(cleanup.deleted_ids.len(), 2);
        assert!(service.repository().list_secret_metadata(&workspace.id).expect("list").is_empty());
    }

    #[test]
    fn cookie_delete_removes_only_target_cookie() {
        let store = Store::open_in_memory().expect("store opens");
        let now = Utc::now();
        let workspace = Workspace {
            id: "wk_cookie_delete".to_string(),
            name: "Cookies".to_string(),
            description: String::new(),
            created_at: now,
            updated_at: now,
        };
        store.upsert_workspace(&workspace).expect("workspace upsert");

        let jar = CookieJar {
            id: "jar_cookie_delete".to_string(),
            workspace_id: workspace.id.clone(),
            name: "Default".to_string(),
            created_at: now,
            updated_at: now,
        };
        store.upsert_cookie_jar(&jar).expect("jar upsert");

        let cookie_a = CookieRecord {
            id: "cookie_a".to_string(),
            workspace_id: workspace.id.clone(),
            jar_id: jar.id.clone(),
            name: "sid".to_string(),
            value: "alpha".to_string(),
            domain: "api.example.test".to_string(),
            path: "/".to_string(),
            expires_at: None,
            secure: true,
            http_only: true,
            same_site: Some("Lax".to_string()),
            created_at: now,
            updated_at: now,
        };
        let cookie_b = CookieRecord {
            id: "cookie_b".to_string(),
            workspace_id: workspace.id.clone(),
            jar_id: jar.id.clone(),
            name: "prefs".to_string(),
            value: "beta".to_string(),
            domain: "api.example.test".to_string(),
            path: "/v1".to_string(),
            expires_at: None,
            secure: false,
            http_only: false,
            same_site: None,
            created_at: now,
            updated_at: now,
        };

        store.upsert_cookie(&cookie_a).expect("cookie a upsert");
        store.upsert_cookie(&cookie_b).expect("cookie b upsert");

        assert!(store.delete_cookie(&cookie_a.id).expect("delete cookie"));
        let remaining = store.list_cookies(&jar.id).expect("list cookies");
        assert_eq!(remaining.len(), 1);
        assert_eq!(remaining[0].id, cookie_b.id);
    }

    #[test]
    fn grpc_services_command_lists_services_from_local_proto_files() {
        let unique = format!(
            "yaku-grpc-services-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("system time")
                .as_nanos()
        );
        let temp_dir = std::env::temp_dir().join(unique);
        let proto_root = temp_dir.join("proto");
        let common_dir = proto_root.join("common");
        let service_dir = temp_dir.join("service");
        std::fs::create_dir_all(&common_dir).expect("create common dir");
        std::fs::create_dir_all(&service_dir).expect("create service dir");

        let shared_proto = common_dir.join("shared.proto");
        let service_proto = service_dir.join("ping.proto");
        std::fs::write(
            &shared_proto,
            r#"
                syntax = "proto3";
                package example.common;

                message SharedName {
                  string value = 1;
                }
            "#,
        )
        .expect("write shared proto");
        std::fs::write(
            &service_proto,
            r#"
                syntax = "proto3";
                package example;

                import "common/shared.proto";

                service PingService {
                  rpc Ping (PingRequest) returns (PingResponse);
                }

                message PingRequest {
                  example.common.SharedName name = 1;
                }

                message PingResponse {
                  string message = 1;
                }
            "#,
        )
        .expect("write service proto");

        let services = tauri::async_runtime::block_on(async {
            cmd_yaku_grpc_services(
                "http://127.0.0.1:1".to_string(),
                BTreeMap::new(),
                vec![service_proto.to_string_lossy().to_string()],
                vec![proto_root.to_string_lossy().to_string()],
                false,
            )
            .await
        })
        .expect("list gRPC services");

        assert!(services.iter().any(|service| service.name == "example.PingService"));
        let ping_service =
            services.iter().find(|service| service.name == "example.PingService").expect("service");
        assert_eq!(ping_service.methods.len(), 1);
        assert_eq!(ping_service.methods[0].name, "Ping");
        assert!(!ping_service.methods[0].schema.is_empty());

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn grpc_services_command_rejects_missing_proto_files_without_reflection() {
        let err = tauri::async_runtime::block_on(async {
            cmd_yaku_grpc_services(
                "http://127.0.0.1:1".to_string(),
                BTreeMap::new(),
                Vec::new(),
                vec!["/tmp/proto".to_string()],
                false,
            )
            .await
        })
        .expect_err("expected error");

        assert!(
            err.to_string()
                .contains("requires at least one proto file when reflection is disabled")
        );
    }
}
