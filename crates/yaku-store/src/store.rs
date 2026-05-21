use crate::SCHEMA_V2;
use chrono::{DateTime, Utc};
use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;
use thiserror::Error;
use yaku_domain::{
    BodyRole, BodyStorageKind, Environment, EnvironmentRepository, Page, Protocol, Request,
    RequestNode, RequestNodeKind, RequestRepository, Run, RunBody, RunBodyRepository, RunEvent,
    RunEventKind, RunRepository, RunState, SecretMetadata, Setting, Workspace, WorkspaceRepository,
};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Error)]
pub enum Error {
    #[error(transparent)]
    Sql(#[from] rusqlite::Error),

    #[error(transparent)]
    Json(#[from] serde_json::Error),

    #[error("invalid request tree: {0}")]
    InvalidRequestTree(String),

    #[error("invalid backup: {0}")]
    InvalidBackup(String),

    #[error("invalid timestamp: {0}")]
    InvalidTimestamp(String),
}

pub struct Store {
    conn: Connection,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceBackup {
    pub format_version: u32,
    pub exported_at: DateTime<Utc>,
    pub content_hash: String,
    pub workspace: Workspace,
    pub environments: Vec<Environment>,
    pub request_tree: Vec<RequestNode>,
    pub requests: Vec<Request>,
    pub run_retention: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupManifest {
    pub id: String,
    pub workspace_id: Option<String>,
    pub content_hash: String,
    pub created_at: DateTime<Utc>,
    pub metadata: BTreeMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceBackupContent<'a> {
    format_version: u32,
    workspace: &'a Workspace,
    environments: &'a [Environment],
    request_tree: &'a [RequestNode],
    requests: &'a [Request],
    run_retention: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunPageItem {
    pub cursor: i64,
    #[serde(flatten)]
    pub run: Run,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestNodePageItem {
    pub cursor: i64,
    #[serde(flatten)]
    pub node: RequestNode,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspacePageItem {
    pub cursor: i64,
    #[serde(flatten)]
    pub workspace: Workspace,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupManifestPageItem {
    pub cursor: i64,
    #[serde(flatten)]
    pub manifest: BackupManifest,
}

impl Store {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let conn = Connection::open(path)?;
        let store = Self { conn };
        store.init()?;
        Ok(store)
    }

    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let store = Self { conn };
        store.init()?;
        Ok(store)
    }

    pub fn init(&self) -> Result<()> {
        self.conn.execute_batch(SCHEMA_V2)?;
        Ok(())
    }

    pub fn export_workspace_backup(&self, workspace_id: &str) -> Result<WorkspaceBackup> {
        let workspace = self
            .get_workspace(workspace_id)?
            .ok_or_else(|| Error::InvalidBackup(format!("workspace '{workspace_id}' not found")))?;
        let environments = self.list_environments(workspace_id)?;
        let request_tree = self.list_request_tree(workspace_id)?;
        let mut requests = request_tree
            .iter()
            .filter_map(|node| node.request_id.as_deref())
            .map(|request_id| {
                self.get_request(request_id)?.ok_or_else(|| {
                    Error::InvalidBackup(format!("request '{request_id}' not found"))
                })
            })
            .collect::<Result<Vec<_>>>()?;
        requests.sort_by(|left, right| left.id.cmp(&right.id));

        let mut backup = WorkspaceBackup {
            format_version: 1,
            exported_at: Utc::now(),
            content_hash: String::new(),
            workspace,
            environments,
            request_tree,
            requests,
            run_retention: workspace_run_retention(self, workspace_id)?,
        };
        backup.content_hash = compute_workspace_backup_content_hash(&backup)?;
        Ok(backup)
    }

    pub fn verify_workspace_backup(&self, backup: &WorkspaceBackup) -> Result<String> {
        let _ = self;
        validate_workspace_backup(backup)
    }

    pub fn upsert_backup_manifest(&self, manifest: &BackupManifest) -> Result<()> {
        self.conn.execute(
            r#"
                INSERT INTO backup_manifests
                    (id, workspace_id, content_hash, created_at, metadata)
                VALUES (?1, ?2, ?3, ?4, ?5)
                ON CONFLICT(id) DO UPDATE SET
                    workspace_id = excluded.workspace_id,
                    content_hash = excluded.content_hash,
                    created_at = excluded.created_at,
                    metadata = excluded.metadata
            "#,
            params![
                manifest.id,
                manifest.workspace_id,
                manifest.content_hash,
                manifest.created_at.to_rfc3339(),
                serde_json::to_string(&manifest.metadata)?,
            ],
        )?;
        Ok(())
    }

    pub fn get_backup_manifest(&self, id: &str) -> Result<Option<BackupManifest>> {
        self.conn
            .query_row(
                r#"
                    SELECT id, workspace_id, content_hash, created_at, metadata
                    FROM backup_manifests
                    WHERE id = ?1
                "#,
                [id],
                row_to_backup_manifest,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn list_backup_manifests(&self, workspace_id: Option<&str>) -> Result<Vec<BackupManifest>> {
        match workspace_id {
            Some(workspace_id) => {
                let mut stmt = self.conn.prepare(
                    r#"
                        SELECT id, workspace_id, content_hash, created_at, metadata
                        FROM backup_manifests
                        WHERE workspace_id = ?1
                        ORDER BY created_at ASC, id ASC
                    "#,
                )?;
                let rows = stmt.query_map([workspace_id], row_to_backup_manifest)?;
                rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
            }
            None => {
                let mut stmt = self.conn.prepare(
                    r#"
                        SELECT id, workspace_id, content_hash, created_at, metadata
                        FROM backup_manifests
                        ORDER BY created_at ASC, id ASC
                    "#,
                )?;
                let rows = stmt.query_map([], row_to_backup_manifest)?;
                rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
            }
        }
    }

    pub fn list_backup_manifest_page(
        &self,
        workspace_id: Option<&str>,
        content_hash: Option<&str>,
        page: Page,
    ) -> Result<Vec<BackupManifestPageItem>> {
        let limit = normalized_limit(page.limit);
        let cursor = page.cursor.unwrap_or(i64::MAX);

        match (workspace_id, content_hash) {
            (Some(workspace_id), Some(content_hash)) => {
                let mut stmt = self.conn.prepare(
                    r#"
                        SELECT rowid, id, workspace_id, content_hash, created_at, metadata
                        FROM backup_manifests
                        WHERE workspace_id = ?1 AND content_hash = ?2 AND rowid < ?3
                        ORDER BY rowid DESC
                        LIMIT ?4
                    "#,
                )?;
                let rows = stmt.query_map(
                    params![workspace_id, content_hash, cursor, limit],
                    row_to_backup_manifest_page_item,
                )?;
                rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
            }
            (Some(workspace_id), None) => {
                let mut stmt = self.conn.prepare(
                    r#"
                        SELECT rowid, id, workspace_id, content_hash, created_at, metadata
                        FROM backup_manifests
                        WHERE workspace_id = ?1 AND rowid < ?2
                        ORDER BY rowid DESC
                        LIMIT ?3
                    "#,
                )?;
                let rows = stmt.query_map(
                    params![workspace_id, cursor, limit],
                    row_to_backup_manifest_page_item,
                )?;
                rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
            }
            (None, Some(content_hash)) => {
                let mut stmt = self.conn.prepare(
                    r#"
                        SELECT rowid, id, workspace_id, content_hash, created_at, metadata
                        FROM backup_manifests
                        WHERE content_hash = ?1 AND rowid < ?2
                        ORDER BY rowid DESC
                        LIMIT ?3
                    "#,
                )?;
                let rows = stmt.query_map(
                    params![content_hash, cursor, limit],
                    row_to_backup_manifest_page_item,
                )?;
                rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
            }
            (None, None) => {
                let mut stmt = self.conn.prepare(
                    r#"
                        SELECT rowid, id, workspace_id, content_hash, created_at, metadata
                        FROM backup_manifests
                        WHERE rowid < ?1
                        ORDER BY rowid DESC
                        LIMIT ?2
                    "#,
                )?;
                let rows =
                    stmt.query_map(params![cursor, limit], row_to_backup_manifest_page_item)?;
                rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
            }
        }
    }

    pub fn import_workspace_backup(
        &self,
        backup: &WorkspaceBackup,
        replace_existing: bool,
    ) -> Result<bool> {
        validate_workspace_backup(backup)?;

        let request_lookup = backup
            .requests
            .iter()
            .map(|request| (request.id.as_str(), request))
            .collect::<BTreeMap<_, _>>();

        let tx = self.conn.unchecked_transaction()?;
        let existing_workspace = tx
            .query_row("SELECT 1 FROM workspaces WHERE id = ?1", [&backup.workspace.id], |_| Ok(()))
            .optional()?
            .is_some();

        if existing_workspace && !replace_existing {
            return Err(Error::InvalidRequestTree(format!(
                "workspace '{}' already exists; pass --replace-existing to overwrite it",
                backup.workspace.id
            )));
        }

        if existing_workspace {
            clear_workspace_for_import_tx(&tx, &backup.workspace.id)?;
        }

        upsert_workspace_tx(&tx, &backup.workspace)?;

        for environment in &backup.environments {
            upsert_environment_tx(&tx, environment)?;
        }

        let mut inserted_node_ids = BTreeSet::new();
        let mut pending_nodes = backup.request_tree.iter().collect::<Vec<_>>();
        while !pending_nodes.is_empty() {
            let mut progressed = false;
            let mut next_pending = Vec::new();

            for node in pending_nodes {
                if let Some(parent_id) = &node.parent_id {
                    if !inserted_node_ids.contains(parent_id) {
                        next_pending.push(node);
                        continue;
                    }
                }

                match node.kind {
                    RequestNodeKind::Folder => upsert_request_node_tx(&tx, node)?,
                    RequestNodeKind::Request => {
                        let request_id = node.request_id.as_deref().ok_or_else(|| {
                            Error::InvalidRequestTree(format!(
                                "request node '{}' is missing request_id",
                                node.id
                            ))
                        })?;
                        let request = request_lookup.get(request_id).copied().ok_or_else(|| {
                            Error::InvalidRequestTree(format!(
                                "request '{}' referenced by node '{}' is missing from backup",
                                request_id, node.id
                            ))
                        })?;
                        upsert_request_tx(&tx, request, node)?;
                    }
                }

                inserted_node_ids.insert(node.id.clone());
                progressed = true;
            }

            if !progressed {
                let unresolved = next_pending
                    .into_iter()
                    .map(|node| {
                        format!("{} -> {}", node.id, node.parent_id.as_deref().unwrap_or("<root>"))
                    })
                    .collect::<Vec<_>>()
                    .join(", ");
                return Err(Error::InvalidRequestTree(format!(
                    "workspace backup request tree contains unresolved parents or a cycle: {unresolved}"
                )));
            }

            pending_nodes = next_pending;
        }

        let retention_key = workspace_run_retention_key(&backup.workspace.id);
        match backup.run_retention {
            Some(keep_last) => upsert_setting_tx(
                &tx,
                &Setting {
                    key: retention_key,
                    value: serde_json::json!(keep_last),
                    updated_at: backup.exported_at,
                },
            )?,
            None => {
                tx.execute("DELETE FROM settings WHERE key = ?1", [&retention_key])?;
            }
        }

        tx.commit()?;
        Ok(existing_workspace)
    }

    pub fn upsert_workspace(&self, workspace: &Workspace) -> Result<()> {
        self.conn.execute(
            r#"
                INSERT INTO workspaces (id, name, description, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    description = excluded.description,
                    updated_at = excluded.updated_at
            "#,
            params![
                workspace.id,
                workspace.name,
                workspace.description,
                workspace.created_at.to_rfc3339(),
                workspace.updated_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn list_workspaces(&self) -> Result<Vec<Workspace>> {
        Ok(self
            .list_workspace_page(Page::first(500))?
            .into_iter()
            .map(|item| item.workspace)
            .collect())
    }

    pub fn list_workspace_page(&self, page: Page) -> Result<Vec<WorkspacePageItem>> {
        let limit = normalized_limit(page.limit);
        let cursor = page.cursor.unwrap_or(i64::MAX);
        let mut stmt = self.conn.prepare(
            r#"
                SELECT rowid, id, name, description, created_at, updated_at
                FROM workspaces
                WHERE rowid < ?1
                ORDER BY rowid DESC
                LIMIT ?2
            "#,
        )?;
        let rows = stmt.query_map(params![cursor, limit], row_to_workspace_page_item)?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn get_workspace(&self, id: &str) -> Result<Option<Workspace>> {
        self.conn
            .query_row(
                r#"
                    SELECT id, name, description, created_at, updated_at
                    FROM workspaces
                    WHERE id = ?1
                "#,
                [id],
                row_to_workspace,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn delete_workspace(&self, id: &str) -> Result<bool> {
        let deleted = self.conn.execute("DELETE FROM workspaces WHERE id = ?1", [id])?;
        Ok(deleted > 0)
    }

    pub fn upsert_request(&self, request: &Request, node: &RequestNode) -> Result<()> {
        validate_request_node_pair(request, node)?;
        let tx = self.conn.unchecked_transaction()?;
        tx.execute(
            r#"
                INSERT INTO requests
                    (id, workspace_id, protocol, name, description, config, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                ON CONFLICT(id) DO UPDATE SET
                    workspace_id = excluded.workspace_id,
                    protocol = excluded.protocol,
                    name = excluded.name,
                    description = excluded.description,
                    config = excluded.config,
                    updated_at = excluded.updated_at
            "#,
            params![
                request.id,
                request.workspace_id,
                serde_json::to_string(&request.protocol)?,
                request.name,
                request.description,
                serde_json::to_string(&request.config)?,
                request.created_at.to_rfc3339(),
                request.updated_at.to_rfc3339(),
            ],
        )?;
        tx.execute(
            r#"
                INSERT INTO request_nodes
                    (id, workspace_id, parent_id, request_id, kind, name, sort_key, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                ON CONFLICT(id) DO UPDATE SET
                    workspace_id = excluded.workspace_id,
                    parent_id = excluded.parent_id,
                    request_id = excluded.request_id,
                    kind = excluded.kind,
                    name = excluded.name,
                    sort_key = excluded.sort_key,
                    updated_at = excluded.updated_at
            "#,
            params![
                node.id,
                node.workspace_id,
                node.parent_id,
                node.request_id,
                serde_json::to_string(&node.kind)?,
                node.name,
                node.sort_key,
                node.created_at.to_rfc3339(),
                node.updated_at.to_rfc3339(),
            ],
        )?;
        tx.commit()?;
        Ok(())
    }

    pub fn upsert_request_node(&self, node: &RequestNode) -> Result<()> {
        validate_request_node(node)?;
        self.conn.execute(
            r#"
                INSERT INTO request_nodes
                    (id, workspace_id, parent_id, request_id, kind, name, sort_key, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                ON CONFLICT(id) DO UPDATE SET
                    workspace_id = excluded.workspace_id,
                    parent_id = excluded.parent_id,
                    request_id = excluded.request_id,
                    kind = excluded.kind,
                    name = excluded.name,
                    sort_key = excluded.sort_key,
                    updated_at = excluded.updated_at
            "#,
            params![
                node.id,
                node.workspace_id,
                node.parent_id,
                node.request_id,
                serde_json::to_string(&node.kind)?,
                node.name,
                node.sort_key,
                node.created_at.to_rfc3339(),
                node.updated_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn get_request(&self, id: &str) -> Result<Option<Request>> {
        self.conn
            .query_row(
                r#"
                    SELECT id, workspace_id, protocol, name, description, config, created_at, updated_at
                    FROM requests
                    WHERE id = ?1
                "#,
                [id],
                row_to_request,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn get_request_node(&self, id: &str) -> Result<Option<RequestNode>> {
        self.conn
            .query_row(
                r#"
                    SELECT id, workspace_id, parent_id, request_id, kind, name, sort_key, created_at, updated_at
                    FROM request_nodes
                    WHERE id = ?1
                "#,
                [id],
                row_to_request_node,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn delete_request_node(&self, id: &str) -> Result<bool> {
        let request_ids = self.request_ids_in_node_subtree(id)?;
        let tx = self.conn.unchecked_transaction()?;
        let deleted = tx.execute("DELETE FROM request_nodes WHERE id = ?1", [id])?;
        for request_id in request_ids {
            tx.execute("DELETE FROM requests WHERE id = ?1", [request_id])?;
        }
        tx.commit()?;
        Ok(deleted > 0)
    }

    fn request_ids_in_node_subtree(&self, id: &str) -> Result<Vec<String>> {
        let mut stmt = self.conn.prepare(
            r#"
                WITH RECURSIVE subtree(id, request_id) AS (
                    SELECT id, request_id FROM request_nodes WHERE id = ?1
                    UNION ALL
                    SELECT child.id, child.request_id
                    FROM request_nodes child
                    JOIN subtree parent ON child.parent_id = parent.id
                )
                SELECT request_id
                FROM subtree
                WHERE request_id IS NOT NULL
            "#,
        )?;
        let rows = stmt.query_map([id], |row| row.get::<_, String>(0))?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn list_request_tree(&self, workspace_id: &str) -> Result<Vec<RequestNode>> {
        let mut stmt = self.conn.prepare(
            r#"
                SELECT id, workspace_id, parent_id, request_id, kind, name, sort_key, created_at, updated_at
                FROM request_nodes
                WHERE workspace_id = ?1
                ORDER BY parent_id, sort_key, name, id
            "#,
        )?;
        let rows = stmt.query_map([workspace_id], |row| row_to_request_node(row))?;

        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn list_request_node_page(
        &self,
        workspace_id: &str,
        page: Page,
    ) -> Result<Vec<RequestNodePageItem>> {
        let limit = normalized_limit(page.limit);
        let cursor = page.cursor.unwrap_or(0);
        let mut stmt = self.conn.prepare(
            r#"
                SELECT rowid, id, workspace_id, parent_id, request_id, kind, name, sort_key, created_at, updated_at
                FROM request_nodes
                WHERE workspace_id = ?1 AND rowid > ?2
                ORDER BY rowid ASC
                LIMIT ?3
            "#,
        )?;
        let rows =
            stmt.query_map(params![workspace_id, cursor, limit], row_to_request_node_page_item)?;

        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn upsert_run(&self, run: &Run) -> Result<()> {
        self.conn.execute(
            r#"
                INSERT INTO runs
                    (id, workspace_id, request_id, protocol, state, started_at, completed_at, status_code, error)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                ON CONFLICT(id) DO UPDATE SET
                    state = excluded.state,
                    completed_at = excluded.completed_at,
                    status_code = excluded.status_code,
                    error = excluded.error
            "#,
            params![
                run.id,
                run.workspace_id,
                run.request_id,
                serde_json::to_string(&run.protocol)?,
                serde_json::to_string(&run.state)?,
                run.started_at.to_rfc3339(),
                run.completed_at.map(|dt| dt.to_rfc3339()),
                run.status_code,
                run.error,
            ],
        )?;
        Ok(())
    }

    pub fn get_run(&self, id: &str) -> Result<Option<Run>> {
        self.conn
            .query_row(
                r#"
                    SELECT rowid, id, workspace_id, request_id, protocol, state, started_at, completed_at, status_code, error
                    FROM runs
                    WHERE id = ?1
                "#,
                [id],
                row_to_run,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn list_runs_for_request(&self, request_id: &str, page: Page) -> Result<Vec<Run>> {
        Ok(self
            .list_run_page_for_request(request_id, page)?
            .into_iter()
            .map(|item| item.run)
            .collect())
    }

    pub fn list_run_page_for_request(
        &self,
        request_id: &str,
        page: Page,
    ) -> Result<Vec<RunPageItem>> {
        let limit = normalized_limit(page.limit);
        let cursor = page.cursor.unwrap_or(i64::MAX);
        let mut stmt = self.conn.prepare(
            r#"
                SELECT rowid, id, workspace_id, request_id, protocol, state, started_at, completed_at, status_code, error
                FROM runs
                WHERE request_id = ?1 AND rowid < ?2
                ORDER BY rowid DESC
                LIMIT ?3
            "#,
        )?;
        let rows = stmt.query_map(params![request_id, cursor, limit], row_to_run_page_item)?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn list_runs_for_workspace(&self, workspace_id: &str, page: Page) -> Result<Vec<Run>> {
        Ok(self
            .list_run_page_for_workspace(workspace_id, page)?
            .into_iter()
            .map(|item| item.run)
            .collect())
    }

    pub fn list_runs_by_state(&self, state: RunState) -> Result<Vec<Run>> {
        let state_json = serde_json::to_string(&state)?;
        let mut stmt = self.conn.prepare(
            r#"
                SELECT rowid, id, workspace_id, request_id, protocol, state, started_at, completed_at, status_code, error
                FROM runs
                WHERE state = ?1
                ORDER BY rowid DESC
            "#,
        )?;
        let rows = stmt.query_map([state_json], row_to_run)?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn list_run_page_for_workspace(
        &self,
        workspace_id: &str,
        page: Page,
    ) -> Result<Vec<RunPageItem>> {
        let limit = normalized_limit(page.limit);
        let cursor = page.cursor.unwrap_or(i64::MAX);
        let mut stmt = self.conn.prepare(
            r#"
                SELECT rowid, id, workspace_id, request_id, protocol, state, started_at, completed_at, status_code, error
                FROM runs
                WHERE workspace_id = ?1 AND rowid < ?2
                ORDER BY rowid DESC
                LIMIT ?3
            "#,
        )?;
        let rows = stmt.query_map(params![workspace_id, cursor, limit], row_to_run_page_item)?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn delete_run(&self, id: &str) -> Result<bool> {
        let deleted = self.conn.execute("DELETE FROM runs WHERE id = ?1", [id])?;
        Ok(deleted > 0)
    }

    pub fn prune_runs_for_request(&self, request_id: &str, keep_last: u32) -> Result<u64> {
        self.prune_runs(
            r#"
                SELECT rowid
                FROM runs
                WHERE request_id = ?1
                ORDER BY rowid DESC
                LIMIT -1 OFFSET ?2
            "#,
            request_id,
            keep_last,
        )
    }

    pub fn prune_runs_for_workspace(&self, workspace_id: &str, keep_last: u32) -> Result<u64> {
        self.prune_runs(
            r#"
                SELECT rowid
                FROM runs
                WHERE workspace_id = ?1
                ORDER BY rowid DESC
                LIMIT -1 OFFSET ?2
            "#,
            workspace_id,
            keep_last,
        )
    }

    fn prune_runs(&self, select_sql: &str, id: &str, keep_last: u32) -> Result<u64> {
        let rowids = {
            let mut stmt = self.conn.prepare(select_sql)?;
            let rows = stmt.query_map(params![id, i64::from(keep_last)], |row| row.get(0))?;
            rows.collect::<std::result::Result<Vec<i64>, _>>()?
        };
        let tx = self.conn.unchecked_transaction()?;
        let mut deleted = 0_u64;
        for rowid in rowids {
            deleted += tx.execute("DELETE FROM runs WHERE rowid = ?1", [rowid])? as u64;
        }
        tx.commit()?;
        Ok(deleted)
    }

    pub fn append_run_event(&self, event: &RunEvent) -> Result<i64> {
        self.conn.execute(
            r#"
                INSERT INTO run_events
                    (run_id, workspace_id, sequence, kind, data, created_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            "#,
            params![
                event.run_id,
                event.workspace_id,
                event.sequence,
                serde_json::to_string(&event.kind)?,
                serde_json::to_string(&event.data)?,
                event.created_at.to_rfc3339(),
            ],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn list_run_events(&self, run_id: &str, page: Page) -> Result<Vec<RunEvent>> {
        let limit = normalized_limit(page.limit);
        let cursor = page.cursor.unwrap_or(0);
        let mut stmt = self.conn.prepare(
            r#"
                SELECT id, run_id, workspace_id, sequence, kind, data, created_at
                FROM run_events
                WHERE run_id = ?1 AND id > ?2
                ORDER BY id ASC
                LIMIT ?3
            "#,
        )?;
        let rows = stmt.query_map(params![run_id, cursor, limit], row_to_run_event)?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn list_run_events_by_kind(
        &self,
        run_id: &str,
        kind: RunEventKind,
        page: Page,
    ) -> Result<Vec<RunEvent>> {
        let limit = normalized_limit(page.limit);
        let cursor = page.cursor.unwrap_or(0);
        let mut stmt = self.conn.prepare(
            r#"
                SELECT id, run_id, workspace_id, sequence, kind, data, created_at
                FROM run_events
                WHERE run_id = ?1 AND kind = ?2 AND id > ?3
                ORDER BY id ASC
                LIMIT ?4
            "#,
        )?;
        let rows = stmt.query_map(
            params![run_id, serde_json::to_string(&kind)?, cursor, limit],
            row_to_run_event,
        )?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn latest_run_event_by_kind(
        &self,
        run_id: &str,
        kind: RunEventKind,
    ) -> Result<Option<RunEvent>> {
        self.conn
            .query_row(
                r#"
                    SELECT id, run_id, workspace_id, sequence, kind, data, created_at
                    FROM run_events
                    WHERE run_id = ?1 AND kind = ?2
                    ORDER BY sequence DESC, id DESC
                    LIMIT 1
                "#,
                params![run_id, serde_json::to_string(&kind)?],
                row_to_run_event,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn upsert_environment(&self, environment: &Environment) -> Result<()> {
        self.conn.execute(
            r#"
                INSERT INTO environments
                    (id, workspace_id, name, variables, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    variables = excluded.variables,
                    updated_at = excluded.updated_at
            "#,
            params![
                environment.id,
                environment.workspace_id,
                environment.name,
                serde_json::to_string(&environment.variables)?,
                environment.created_at.to_rfc3339(),
                environment.updated_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn list_environments(&self, workspace_id: &str) -> Result<Vec<Environment>> {
        let mut stmt = self.conn.prepare(
            r#"
                SELECT id, workspace_id, name, variables, created_at, updated_at
                FROM environments
                WHERE workspace_id = ?1
                ORDER BY name ASC, id ASC
            "#,
        )?;
        let rows = stmt.query_map([workspace_id], row_to_environment)?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn get_environment(&self, id: &str) -> Result<Option<Environment>> {
        self.conn
            .query_row(
                r#"
                    SELECT id, workspace_id, name, variables, created_at, updated_at
                    FROM environments
                    WHERE id = ?1
                "#,
                [id],
                row_to_environment,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn delete_environment(&self, id: &str) -> Result<bool> {
        let deleted = self.conn.execute("DELETE FROM environments WHERE id = ?1", [id])?;
        Ok(deleted > 0)
    }

    pub fn upsert_setting(&self, setting: &Setting) -> Result<()> {
        self.conn.execute(
            r#"
                INSERT INTO settings (key, value, updated_at)
                VALUES (?1, ?2, ?3)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = excluded.updated_at
            "#,
            params![
                setting.key,
                serde_json::to_string(&setting.value)?,
                setting.updated_at.to_rfc3339()
            ],
        )?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<Setting>> {
        self.conn
            .query_row(
                r#"
                    SELECT key, value, updated_at
                    FROM settings
                    WHERE key = ?1
                "#,
                [key],
                row_to_setting,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn delete_setting(&self, key: &str) -> Result<bool> {
        let deleted = self.conn.execute("DELETE FROM settings WHERE key = ?1", [key])?;
        Ok(deleted > 0)
    }

    pub fn upsert_secret_metadata(&self, secret: &SecretMetadata) -> Result<()> {
        self.conn.execute(
            r#"
                INSERT INTO secrets
                    (id, workspace_id, name, ciphertext, metadata, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    ciphertext = excluded.ciphertext,
                    metadata = excluded.metadata,
                    updated_at = excluded.updated_at
            "#,
            params![
                secret.id,
                secret.workspace_id,
                secret.name,
                secret.ciphertext,
                serde_json::to_string(&secret.metadata)?,
                secret.created_at.to_rfc3339(),
                secret.updated_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn list_secret_metadata(&self, workspace_id: &str) -> Result<Vec<SecretMetadata>> {
        let mut stmt = self.conn.prepare(
            r#"
                SELECT id, workspace_id, name, ciphertext, metadata, created_at, updated_at
                FROM secrets
                WHERE workspace_id = ?1
                ORDER BY name ASC
            "#,
        )?;
        let rows = stmt.query_map([workspace_id], row_to_secret_metadata)?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn upsert_run_body(&self, body: &RunBody) -> Result<()> {
        self.conn.execute(
            r#"
                INSERT INTO run_bodies
                    (id, run_id, workspace_id, event_id, body_role, content_type, byte_length, storage_kind, storage_ref, created_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
                ON CONFLICT(id) DO UPDATE SET
                    event_id = excluded.event_id,
                    content_type = excluded.content_type,
                    byte_length = excluded.byte_length,
                    storage_kind = excluded.storage_kind,
                    storage_ref = excluded.storage_ref
            "#,
            params![
                body.id,
                body.run_id,
                body.workspace_id,
                body.event_id,
                serde_json::to_string(&body.body_role)?,
                body.content_type,
                body.byte_length,
                serde_json::to_string(&body.storage_kind)?,
                body.storage_ref,
                body.created_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn list_run_bodies(&self, run_id: &str) -> Result<Vec<RunBody>> {
        let mut stmt = self.conn.prepare(
            r#"
                SELECT id, run_id, workspace_id, event_id, body_role, content_type, byte_length, storage_kind, storage_ref, created_at
                FROM run_bodies
                WHERE run_id = ?1
                ORDER BY created_at ASC, id ASC
            "#,
        )?;
        let rows = stmt.query_map([run_id], row_to_run_body)?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn list_all_run_bodies(&self) -> Result<Vec<RunBody>> {
        let mut stmt = self.conn.prepare(
            r#"
                SELECT id, run_id, workspace_id, event_id, body_role, content_type, byte_length, storage_kind, storage_ref, created_at
                FROM run_bodies
                ORDER BY created_at ASC, id ASC
            "#,
        )?;
        let rows = stmt.query_map([], row_to_run_body)?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn get_run_body(&self, id: &str) -> Result<Option<RunBody>> {
        self.conn
            .query_row(
                r#"
                    SELECT id, run_id, workspace_id, event_id, body_role, content_type, byte_length, storage_kind, storage_ref, created_at
                    FROM run_bodies
                    WHERE id = ?1
                "#,
                [id],
                row_to_run_body,
            )
            .optional()
            .map_err(Into::into)
    }
}

impl WorkspaceRepository for Store {
    fn upsert_workspace(&self, workspace: &Workspace) -> yaku_domain::Result<()> {
        Store::upsert_workspace(self, workspace).map_err(domain_error)
    }

    fn get_workspace(&self, id: &str) -> yaku_domain::Result<Option<Workspace>> {
        Store::get_workspace(self, id).map_err(domain_error)
    }

    fn list_workspaces(&self) -> yaku_domain::Result<Vec<Workspace>> {
        Store::list_workspaces(self).map_err(domain_error)
    }

    fn delete_workspace(&self, id: &str) -> yaku_domain::Result<bool> {
        Store::delete_workspace(self, id).map_err(domain_error)
    }
}

impl RequestRepository for Store {
    fn upsert_request(&self, request: &Request, node: &RequestNode) -> yaku_domain::Result<()> {
        Store::upsert_request(self, request, node).map_err(domain_error)
    }

    fn upsert_request_node(&self, node: &RequestNode) -> yaku_domain::Result<()> {
        Store::upsert_request_node(self, node).map_err(domain_error)
    }

    fn get_request(&self, id: &str) -> yaku_domain::Result<Option<Request>> {
        Store::get_request(self, id).map_err(domain_error)
    }

    fn get_request_node(&self, id: &str) -> yaku_domain::Result<Option<RequestNode>> {
        Store::get_request_node(self, id).map_err(domain_error)
    }

    fn list_request_tree(&self, workspace_id: &str) -> yaku_domain::Result<Vec<RequestNode>> {
        Store::list_request_tree(self, workspace_id).map_err(domain_error)
    }

    fn delete_request_node(&self, id: &str) -> yaku_domain::Result<bool> {
        Store::delete_request_node(self, id).map_err(domain_error)
    }
}

impl EnvironmentRepository for Store {
    fn upsert_environment(&self, environment: &Environment) -> yaku_domain::Result<()> {
        Store::upsert_environment(self, environment).map_err(domain_error)
    }

    fn get_environment(&self, id: &str) -> yaku_domain::Result<Option<Environment>> {
        Store::get_environment(self, id).map_err(domain_error)
    }

    fn list_environments(&self, workspace_id: &str) -> yaku_domain::Result<Vec<Environment>> {
        Store::list_environments(self, workspace_id).map_err(domain_error)
    }

    fn delete_environment(&self, id: &str) -> yaku_domain::Result<bool> {
        Store::delete_environment(self, id).map_err(domain_error)
    }
}

impl RunRepository for Store {
    fn upsert_run(&self, run: &Run) -> yaku_domain::Result<()> {
        Store::upsert_run(self, run).map_err(domain_error)
    }

    fn get_run(&self, id: &str) -> yaku_domain::Result<Option<Run>> {
        Store::get_run(self, id).map_err(domain_error)
    }

    fn list_runs_for_request(&self, request_id: &str, page: Page) -> yaku_domain::Result<Vec<Run>> {
        Store::list_runs_for_request(self, request_id, page).map_err(domain_error)
    }

    fn list_runs_for_workspace(
        &self,
        workspace_id: &str,
        page: Page,
    ) -> yaku_domain::Result<Vec<Run>> {
        Store::list_runs_for_workspace(self, workspace_id, page).map_err(domain_error)
    }

    fn delete_run(&self, id: &str) -> yaku_domain::Result<bool> {
        Store::delete_run(self, id).map_err(domain_error)
    }

    fn prune_runs_for_request(&self, request_id: &str, keep_last: u32) -> yaku_domain::Result<u64> {
        Store::prune_runs_for_request(self, request_id, keep_last).map_err(domain_error)
    }

    fn prune_runs_for_workspace(
        &self,
        workspace_id: &str,
        keep_last: u32,
    ) -> yaku_domain::Result<u64> {
        Store::prune_runs_for_workspace(self, workspace_id, keep_last).map_err(domain_error)
    }

    fn append_run_event(&self, event: &RunEvent) -> yaku_domain::Result<i64> {
        Store::append_run_event(self, event).map_err(domain_error)
    }

    fn list_run_events(&self, run_id: &str, page: Page) -> yaku_domain::Result<Vec<RunEvent>> {
        Store::list_run_events(self, run_id, page).map_err(domain_error)
    }

    fn list_run_events_by_kind(
        &self,
        run_id: &str,
        kind: RunEventKind,
        page: Page,
    ) -> yaku_domain::Result<Vec<RunEvent>> {
        Store::list_run_events_by_kind(self, run_id, kind, page).map_err(domain_error)
    }

    fn latest_run_event_by_kind(
        &self,
        run_id: &str,
        kind: RunEventKind,
    ) -> yaku_domain::Result<Option<RunEvent>> {
        Store::latest_run_event_by_kind(self, run_id, kind).map_err(domain_error)
    }
}

impl RunBodyRepository for Store {
    fn upsert_run_body(&self, body: &RunBody) -> yaku_domain::Result<()> {
        Store::upsert_run_body(self, body).map_err(domain_error)
    }

    fn list_run_bodies(&self, run_id: &str) -> yaku_domain::Result<Vec<RunBody>> {
        Store::list_run_bodies(self, run_id).map_err(domain_error)
    }
}

fn domain_error(err: Error) -> yaku_domain::Error {
    yaku_domain::Error::Repository(err.to_string())
}

fn validate_workspace_backup(backup: &WorkspaceBackup) -> Result<String> {
    if backup.format_version != 1 {
        return Err(Error::InvalidBackup(format!(
            "unsupported workspace backup format version {}",
            backup.format_version
        )));
    }
    if backup.content_hash.trim().is_empty() {
        return Err(Error::InvalidBackup("contentHash is missing".to_string()));
    }

    let workspace_id = backup.workspace.id.as_str();

    for environment in &backup.environments {
        if environment.workspace_id != workspace_id {
            return Err(Error::InvalidBackup(format!(
                "environment '{}' belongs to workspace '{}', expected '{}'",
                environment.id, environment.workspace_id, workspace_id
            )));
        }
    }

    let mut node_ids = BTreeSet::new();
    let mut request_ids_from_tree = BTreeSet::new();
    for node in &backup.request_tree {
        if node.workspace_id != workspace_id {
            return Err(Error::InvalidBackup(format!(
                "request node '{}' belongs to workspace '{}', expected '{}'",
                node.id, node.workspace_id, workspace_id
            )));
        }
        if !node_ids.insert(node.id.clone()) {
            return Err(Error::InvalidBackup(format!(
                "duplicate request node id '{}' in workspace backup",
                node.id
            )));
        }
        match (&node.kind, &node.request_id) {
            (RequestNodeKind::Folder, None) => {}
            (RequestNodeKind::Request, Some(request_id)) => {
                if !request_ids_from_tree.insert(request_id.clone()) {
                    return Err(Error::InvalidBackup(format!(
                        "multiple request nodes reference request '{}'",
                        request_id
                    )));
                }
            }
            (RequestNodeKind::Folder, Some(request_id)) => {
                return Err(Error::InvalidBackup(format!(
                    "folder node '{}' cannot reference request '{}'",
                    node.id, request_id
                )));
            }
            (RequestNodeKind::Request, None) => {
                return Err(Error::InvalidBackup(format!(
                    "request node '{}' is missing request_id",
                    node.id
                )));
            }
        }
    }

    for node in &backup.request_tree {
        if let Some(parent_id) = &node.parent_id {
            if !node_ids.contains(parent_id) {
                return Err(Error::InvalidBackup(format!(
                    "request node '{}' references missing parent '{}'",
                    node.id, parent_id
                )));
            }
        }
    }

    let mut request_ids_from_list = BTreeSet::new();
    for request in &backup.requests {
        if request.workspace_id != workspace_id {
            return Err(Error::InvalidBackup(format!(
                "request '{}' belongs to workspace '{}', expected '{}'",
                request.id, request.workspace_id, workspace_id
            )));
        }
        if !request_ids_from_list.insert(request.id.clone()) {
            return Err(Error::InvalidBackup(format!(
                "duplicate request id '{}' in workspace backup",
                request.id
            )));
        }
    }

    if request_ids_from_tree != request_ids_from_list {
        let missing_requests =
            request_ids_from_tree.difference(&request_ids_from_list).cloned().collect::<Vec<_>>();
        let orphan_requests =
            request_ids_from_list.difference(&request_ids_from_tree).cloned().collect::<Vec<_>>();
        return Err(Error::InvalidBackup(format!(
            "workspace backup request set does not match request tree (missing: [{}], orphaned: [{}])",
            missing_requests.join(", "),
            orphan_requests.join(", ")
        )));
    }

    let computed_hash = compute_workspace_backup_content_hash(backup)?;
    if backup.content_hash != computed_hash {
        return Err(Error::InvalidBackup(format!(
            "contentHash mismatch: expected '{}', computed '{}'",
            backup.content_hash, computed_hash
        )));
    }

    Ok(computed_hash)
}

fn compute_workspace_backup_content_hash(backup: &WorkspaceBackup) -> Result<String> {
    let content = WorkspaceBackupContent {
        format_version: backup.format_version,
        workspace: &backup.workspace,
        environments: &backup.environments,
        request_tree: &backup.request_tree,
        requests: &backup.requests,
        run_retention: backup.run_retention,
    };
    let json = serde_json::to_vec(&content)?;
    Ok(hex::encode(Sha256::digest(json)))
}

fn workspace_run_retention(store: &Store, workspace_id: &str) -> Result<Option<u32>> {
    let Some(setting) = store.get_setting(&workspace_run_retention_key(workspace_id))? else {
        return Ok(None);
    };
    let keep_last = setting.value.as_u64().ok_or_else(|| {
        Error::InvalidBackup(format!(
            "invalid run retention setting for workspace '{workspace_id}'"
        ))
    })?;
    u32::try_from(keep_last).map(Some).map_err(|_| {
        Error::InvalidBackup(format!(
            "run retention setting for workspace '{workspace_id}' is too large"
        ))
    })
}

fn workspace_run_retention_key(workspace_id: &str) -> String {
    format!("yaku.runRetention.workspace.{workspace_id}.keepLast")
}

fn validate_request_node_pair(request: &Request, node: &RequestNode) -> Result<()> {
    if request.workspace_id != node.workspace_id {
        return Err(Error::InvalidRequestTree(
            "request and node must belong to the same workspace".to_string(),
        ));
    }
    if node.kind != RequestNodeKind::Request {
        return Err(Error::InvalidRequestTree(
            "upsert_request requires a request node".to_string(),
        ));
    }
    if node.request_id.as_deref() != Some(request.id.as_str()) {
        return Err(Error::InvalidRequestTree(
            "request node must reference the request id".to_string(),
        ));
    }
    Ok(())
}

fn validate_request_node(node: &RequestNode) -> Result<()> {
    match (&node.kind, &node.request_id) {
        (RequestNodeKind::Folder, None) | (RequestNodeKind::Request, Some(_)) => Ok(()),
        (RequestNodeKind::Folder, Some(_)) => {
            Err(Error::InvalidRequestTree("folder node cannot reference a request id".to_string()))
        }
        (RequestNodeKind::Request, None) => {
            Err(Error::InvalidRequestTree("request node must reference a request id".to_string()))
        }
    }
}

fn upsert_workspace_tx(tx: &rusqlite::Transaction<'_>, workspace: &Workspace) -> Result<()> {
    tx.execute(
        r#"
            INSERT INTO workspaces (id, name, description, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                created_at = excluded.created_at,
                updated_at = excluded.updated_at
        "#,
        params![
            workspace.id,
            workspace.name,
            workspace.description,
            workspace.created_at.to_rfc3339(),
            workspace.updated_at.to_rfc3339(),
        ],
    )?;
    Ok(())
}

fn clear_workspace_for_import_tx(tx: &rusqlite::Transaction<'_>, workspace_id: &str) -> Result<()> {
    tx.execute("DELETE FROM environments WHERE workspace_id = ?1", [workspace_id])?;
    tx.execute("DELETE FROM runs WHERE workspace_id = ?1", [workspace_id])?;
    tx.execute("DELETE FROM request_nodes WHERE workspace_id = ?1", [workspace_id])?;
    tx.execute("DELETE FROM requests WHERE workspace_id = ?1", [workspace_id])?;
    tx.execute("DELETE FROM secrets WHERE workspace_id = ?1", [workspace_id])?;
    tx.execute("DELETE FROM settings WHERE key = ?1", [workspace_run_retention_key(workspace_id)])?;
    Ok(())
}

fn upsert_request_tx(
    tx: &rusqlite::Transaction<'_>,
    request: &Request,
    node: &RequestNode,
) -> Result<()> {
    validate_request_node_pair(request, node)?;
    tx.execute(
        r#"
            INSERT INTO requests
                (id, workspace_id, protocol, name, description, config, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            ON CONFLICT(id) DO UPDATE SET
                workspace_id = excluded.workspace_id,
                protocol = excluded.protocol,
                name = excluded.name,
                description = excluded.description,
                config = excluded.config,
                updated_at = excluded.updated_at
        "#,
        params![
            request.id,
            request.workspace_id,
            serde_json::to_string(&request.protocol)?,
            request.name,
            request.description,
            serde_json::to_string(&request.config)?,
            request.created_at.to_rfc3339(),
            request.updated_at.to_rfc3339(),
        ],
    )?;
    tx.execute(
        r#"
            INSERT INTO request_nodes
                (id, workspace_id, parent_id, request_id, kind, name, sort_key, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ON CONFLICT(id) DO UPDATE SET
                workspace_id = excluded.workspace_id,
                parent_id = excluded.parent_id,
                request_id = excluded.request_id,
                kind = excluded.kind,
                name = excluded.name,
                sort_key = excluded.sort_key,
                updated_at = excluded.updated_at
        "#,
        params![
            node.id,
            node.workspace_id,
            node.parent_id,
            node.request_id,
            serde_json::to_string(&node.kind)?,
            node.name,
            node.sort_key,
            node.created_at.to_rfc3339(),
            node.updated_at.to_rfc3339(),
        ],
    )?;
    Ok(())
}

fn upsert_request_node_tx(tx: &rusqlite::Transaction<'_>, node: &RequestNode) -> Result<()> {
    validate_request_node(node)?;
    tx.execute(
        r#"
            INSERT INTO request_nodes
                (id, workspace_id, parent_id, request_id, kind, name, sort_key, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ON CONFLICT(id) DO UPDATE SET
                workspace_id = excluded.workspace_id,
                parent_id = excluded.parent_id,
                request_id = excluded.request_id,
                kind = excluded.kind,
                name = excluded.name,
                sort_key = excluded.sort_key,
                updated_at = excluded.updated_at
        "#,
        params![
            node.id,
            node.workspace_id,
            node.parent_id,
            node.request_id,
            serde_json::to_string(&node.kind)?,
            node.name,
            node.sort_key,
            node.created_at.to_rfc3339(),
            node.updated_at.to_rfc3339(),
        ],
    )?;
    Ok(())
}

fn upsert_environment_tx(tx: &rusqlite::Transaction<'_>, environment: &Environment) -> Result<()> {
    tx.execute(
        r#"
            INSERT INTO environments
                (id, workspace_id, name, variables, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                variables = excluded.variables,
                updated_at = excluded.updated_at
        "#,
        params![
            environment.id,
            environment.workspace_id,
            environment.name,
            serde_json::to_string(&environment.variables)?,
            environment.created_at.to_rfc3339(),
            environment.updated_at.to_rfc3339(),
        ],
    )?;
    Ok(())
}

fn upsert_setting_tx(tx: &rusqlite::Transaction<'_>, setting: &Setting) -> Result<()> {
    tx.execute(
        r#"
            INSERT INTO settings (key, value, updated_at)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
        "#,
        params![
            setting.key,
            serde_json::to_string(&setting.value)?,
            setting.updated_at.to_rfc3339()
        ],
    )?;
    Ok(())
}

fn row_to_workspace(row: &rusqlite::Row<'_>) -> rusqlite::Result<Workspace> {
    Ok(Workspace {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        created_at: parse_ts(row.get(3)?)?,
        updated_at: parse_ts(row.get(4)?)?,
    })
}

fn row_to_backup_manifest(row: &rusqlite::Row<'_>) -> rusqlite::Result<BackupManifest> {
    let metadata_json: String = row.get(4)?;
    Ok(BackupManifest {
        id: row.get(0)?,
        workspace_id: row.get(1)?,
        content_hash: row.get(2)?,
        created_at: parse_ts(row.get(3)?)?,
        metadata: serde_json::from_str(&metadata_json).map_err(json_to_sql)?,
    })
}

fn row_to_backup_manifest_page_item(
    row: &rusqlite::Row<'_>,
) -> rusqlite::Result<BackupManifestPageItem> {
    let metadata_json: String = row.get(5)?;
    Ok(BackupManifestPageItem {
        cursor: row.get(0)?,
        manifest: BackupManifest {
            id: row.get(1)?,
            workspace_id: row.get(2)?,
            content_hash: row.get(3)?,
            created_at: parse_ts(row.get(4)?)?,
            metadata: serde_json::from_str(&metadata_json).map_err(json_to_sql)?,
        },
    })
}

fn row_to_workspace_page_item(row: &rusqlite::Row<'_>) -> rusqlite::Result<WorkspacePageItem> {
    Ok(WorkspacePageItem {
        cursor: row.get(0)?,
        workspace: Workspace {
            id: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            created_at: parse_ts(row.get(4)?)?,
            updated_at: parse_ts(row.get(5)?)?,
        },
    })
}

fn row_to_request(row: &rusqlite::Row<'_>) -> rusqlite::Result<Request> {
    let protocol_json: String = row.get(2)?;
    let config_json: String = row.get(5)?;
    Ok(Request {
        id: row.get(0)?,
        workspace_id: row.get(1)?,
        protocol: serde_json::from_str::<Protocol>(&protocol_json).map_err(json_to_sql)?,
        name: row.get(3)?,
        description: row.get(4)?,
        config: serde_json::from_str(&config_json).map_err(json_to_sql)?,
        created_at: parse_ts(row.get(6)?)?,
        updated_at: parse_ts(row.get(7)?)?,
    })
}

fn row_to_request_node(row: &rusqlite::Row<'_>) -> rusqlite::Result<RequestNode> {
    let kind_json: String = row.get(4)?;
    Ok(RequestNode {
        id: row.get(0)?,
        workspace_id: row.get(1)?,
        parent_id: row.get(2)?,
        request_id: row.get(3)?,
        kind: serde_json::from_str::<RequestNodeKind>(&kind_json).map_err(json_to_sql)?,
        name: row.get(5)?,
        sort_key: row.get(6)?,
        created_at: parse_ts(row.get(7)?)?,
        updated_at: parse_ts(row.get(8)?)?,
    })
}

fn row_to_request_node_page_item(row: &rusqlite::Row<'_>) -> rusqlite::Result<RequestNodePageItem> {
    let kind_json: String = row.get(5)?;
    Ok(RequestNodePageItem {
        cursor: row.get(0)?,
        node: RequestNode {
            id: row.get(1)?,
            workspace_id: row.get(2)?,
            parent_id: row.get(3)?,
            request_id: row.get(4)?,
            kind: serde_json::from_str::<RequestNodeKind>(&kind_json).map_err(json_to_sql)?,
            name: row.get(6)?,
            sort_key: row.get(7)?,
            created_at: parse_ts(row.get(8)?)?,
            updated_at: parse_ts(row.get(9)?)?,
        },
    })
}

fn parse_ts(value: String) -> rusqlite::Result<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(&value)
        .map(|dt| dt.with_timezone(&Utc))
        .map_err(|_| rusqlite::Error::InvalidQuery)
}

fn json_to_sql(err: serde_json::Error) -> rusqlite::Error {
    rusqlite::Error::ToSqlConversionFailure(Box::new(err))
}

fn normalized_limit(limit: u32) -> i64 {
    i64::from(limit.clamp(1, 500))
}

fn row_to_run(row: &rusqlite::Row<'_>) -> rusqlite::Result<Run> {
    let protocol_json: String = row.get(4)?;
    let state_json: String = row.get(5)?;
    let completed_at: Option<String> = row.get(7)?;
    Ok(Run {
        id: row.get(1)?,
        workspace_id: row.get(2)?,
        request_id: row.get(3)?,
        protocol: serde_json::from_str::<Protocol>(&protocol_json).map_err(json_to_sql)?,
        state: serde_json::from_str::<RunState>(&state_json).map_err(json_to_sql)?,
        started_at: parse_ts(row.get(6)?)?,
        completed_at: completed_at.map(parse_ts).transpose()?,
        status_code: row.get(8)?,
        error: row.get(9)?,
    })
}

fn row_to_run_page_item(row: &rusqlite::Row<'_>) -> rusqlite::Result<RunPageItem> {
    Ok(RunPageItem { cursor: row.get(0)?, run: row_to_run(row)? })
}

fn row_to_run_event(row: &rusqlite::Row<'_>) -> rusqlite::Result<RunEvent> {
    let kind_json: String = row.get(4)?;
    let data_json: String = row.get(5)?;
    Ok(RunEvent {
        id: row.get(0)?,
        run_id: row.get(1)?,
        workspace_id: row.get(2)?,
        sequence: row.get(3)?,
        kind: serde_json::from_str::<RunEventKind>(&kind_json).map_err(json_to_sql)?,
        data: serde_json::from_str(&data_json).map_err(json_to_sql)?,
        created_at: parse_ts(row.get(6)?)?,
    })
}

fn row_to_environment(row: &rusqlite::Row<'_>) -> rusqlite::Result<Environment> {
    let variables_json: String = row.get(3)?;
    Ok(Environment {
        id: row.get(0)?,
        workspace_id: row.get(1)?,
        name: row.get(2)?,
        variables: serde_json::from_str(&variables_json).map_err(json_to_sql)?,
        created_at: parse_ts(row.get(4)?)?,
        updated_at: parse_ts(row.get(5)?)?,
    })
}

fn row_to_setting(row: &rusqlite::Row<'_>) -> rusqlite::Result<Setting> {
    let value_json: String = row.get(1)?;
    Ok(Setting {
        key: row.get(0)?,
        value: serde_json::from_str(&value_json).map_err(json_to_sql)?,
        updated_at: parse_ts(row.get(2)?)?,
    })
}

fn row_to_secret_metadata(row: &rusqlite::Row<'_>) -> rusqlite::Result<SecretMetadata> {
    let metadata_json: String = row.get(4)?;
    Ok(SecretMetadata {
        id: row.get(0)?,
        workspace_id: row.get(1)?,
        name: row.get(2)?,
        ciphertext: row.get(3)?,
        metadata: serde_json::from_str(&metadata_json).map_err(json_to_sql)?,
        created_at: parse_ts(row.get(5)?)?,
        updated_at: parse_ts(row.get(6)?)?,
    })
}

fn row_to_run_body(row: &rusqlite::Row<'_>) -> rusqlite::Result<RunBody> {
    let body_role_json: String = row.get(4)?;
    let storage_kind_json: String = row.get(7)?;
    Ok(RunBody {
        id: row.get(0)?,
        run_id: row.get(1)?,
        workspace_id: row.get(2)?,
        event_id: row.get(3)?,
        body_role: serde_json::from_str::<BodyRole>(&body_role_json).map_err(json_to_sql)?,
        content_type: row.get(5)?,
        byte_length: row.get(6)?,
        storage_kind: serde_json::from_str::<BodyStorageKind>(&storage_kind_json)
            .map_err(json_to_sql)?,
        storage_ref: row.get(8)?,
        created_at: parse_ts(row.get(9)?)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::collections::BTreeMap;
    use yaku_domain::{
        AppendRunEvent, CreateRequest, CreateRun, CreateWorkspace, DomainService, FinishRun,
    };

    #[test]
    fn stores_workspace_and_request_tree() {
        let store = Store::open_in_memory().expect("store opens");
        let now = Utc::now();
        let workspace = Workspace {
            id: "wk_v2".to_string(),
            name: "Yaku".to_string(),
            description: String::new(),
            created_at: now,
            updated_at: now,
        };
        store.upsert_workspace(&workspace).expect("workspace upsert");

        let mut config = BTreeMap::new();
        config.insert("method".to_string(), json!("GET"));
        config.insert("url".to_string(), json!("https://example.test"));
        let request = Request {
            id: "rq_v2".to_string(),
            workspace_id: workspace.id.clone(),
            protocol: Protocol::Http,
            name: "Health".to_string(),
            description: String::new(),
            config,
            created_at: now,
            updated_at: now,
        };
        let node = RequestNode {
            id: "node_v2".to_string(),
            workspace_id: workspace.id.clone(),
            parent_id: None,
            request_id: Some(request.id.clone()),
            kind: RequestNodeKind::Request,
            name: request.name.clone(),
            sort_key: "a".to_string(),
            created_at: now,
            updated_at: now,
        };
        store.upsert_request(&request, &node).expect("request upsert");

        let loaded = store.get_workspace(&workspace.id).expect("workspace read").unwrap();
        assert_eq!(loaded.name, "Yaku");

        let workspaces = store.list_workspaces().expect("workspace list");
        assert_eq!(workspaces.len(), 1);

        let loaded_request = store.get_request(&request.id).expect("request read").unwrap();
        assert_eq!(loaded_request.protocol, Protocol::Http);
        assert_eq!(loaded_request.config.get("method"), Some(&json!("GET")));

        let tree = store.list_request_tree(&workspace.id).expect("tree read");
        assert_eq!(tree.len(), 1);
        assert_eq!(tree[0].request_id.as_deref(), Some("rq_v2"));
    }

    #[test]
    fn validates_request_node_pair() {
        let store = Store::open_in_memory().expect("store opens");
        let now = Utc::now();
        let workspace = Workspace {
            id: "wk_v2".to_string(),
            name: "Yaku".to_string(),
            description: String::new(),
            created_at: now,
            updated_at: now,
        };
        store.upsert_workspace(&workspace).expect("workspace upsert");

        let request = Request {
            id: "rq_v2".to_string(),
            workspace_id: workspace.id.clone(),
            protocol: Protocol::Http,
            name: "Health".to_string(),
            description: String::new(),
            config: BTreeMap::new(),
            created_at: now,
            updated_at: now,
        };
        let bad_node = RequestNode {
            id: "node_v2".to_string(),
            workspace_id: "wk_other".to_string(),
            parent_id: None,
            request_id: Some(request.id.clone()),
            kind: RequestNodeKind::Request,
            name: request.name.clone(),
            sort_key: "a".to_string(),
            created_at: now,
            updated_at: now,
        };

        let err = store.upsert_request(&request, &bad_node).expect_err("invalid pair fails");
        assert!(matches!(err, Error::InvalidRequestTree(_)));
    }

    #[test]
    fn deletes_request_node_and_owned_request() {
        let store = Store::open_in_memory().expect("store opens");
        let now = Utc::now();
        let workspace = Workspace {
            id: "wk_v2".to_string(),
            name: "Yaku".to_string(),
            description: String::new(),
            created_at: now,
            updated_at: now,
        };
        store.upsert_workspace(&workspace).expect("workspace upsert");

        let request = Request {
            id: "rq_v2".to_string(),
            workspace_id: workspace.id.clone(),
            protocol: Protocol::Http,
            name: "Health".to_string(),
            description: String::new(),
            config: BTreeMap::new(),
            created_at: now,
            updated_at: now,
        };
        let node = RequestNode {
            id: "node_v2".to_string(),
            workspace_id: workspace.id.clone(),
            parent_id: None,
            request_id: Some(request.id.clone()),
            kind: RequestNodeKind::Request,
            name: request.name.clone(),
            sort_key: "a".to_string(),
            created_at: now,
            updated_at: now,
        };
        store.upsert_request(&request, &node).expect("request upsert");

        assert!(store.delete_request_node(&node.id).expect("node delete"));
        assert!(store.get_request(&request.id).expect("request read").is_none());
        assert!(store.list_request_tree(&workspace.id).expect("tree read").is_empty());
    }

    #[test]
    fn deletes_folder_subtree_and_owned_requests() {
        let store = Store::open_in_memory().expect("store opens");
        let service = DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: "Yaku".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        let folder = service
            .create_folder(yaku_domain::CreateFolder {
                id: "folder_v2".to_string(),
                workspace_id: workspace.id.clone(),
                parent_id: None,
                name: "Folder".to_string(),
                sort_key: "a".to_string(),
                now,
            })
            .expect("folder create");
        let request = service
            .create_request(CreateRequest {
                id: "rq_v2".to_string(),
                node_id: "node_v2".to_string(),
                workspace_id: workspace.id.clone(),
                parent_id: Some(folder.id.clone()),
                protocol: Protocol::Http,
                name: "Health".to_string(),
                description: String::new(),
                config: BTreeMap::new(),
                sort_key: "b".to_string(),
                now,
            })
            .expect("request create");
        let run = service
            .create_run(CreateRun { id: "run_v2".to_string(), request_id: request.id.clone(), now })
            .expect("run create");

        service.delete_request_node(&folder.id).expect("folder delete");

        let store = service.into_inner();
        assert!(store.get_request(&request.id).expect("request read").is_none());
        assert!(store.get_request_node(&folder.id).expect("folder read").is_none());
        assert!(store.get_request_node("node_v2").expect("node read").is_none());
        assert!(store.get_run(&run.id).expect("run read").is_none());
    }

    #[test]
    fn stores_folder_nodes_and_moves_request_nodes() {
        let store = Store::open_in_memory().expect("store opens");
        let service = DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: "Yaku".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        let folder = service
            .create_folder(yaku_domain::CreateFolder {
                id: "folder_v2".to_string(),
                workspace_id: workspace.id.clone(),
                parent_id: None,
                name: "Collection".to_string(),
                sort_key: "a".to_string(),
                now,
            })
            .expect("folder create");
        let request = service
            .create_request(CreateRequest {
                id: "rq_v2".to_string(),
                node_id: "node_v2".to_string(),
                workspace_id: workspace.id.clone(),
                parent_id: Some(folder.id.clone()),
                protocol: Protocol::Http,
                name: "Health".to_string(),
                description: String::new(),
                config: BTreeMap::new(),
                sort_key: "b".to_string(),
                now,
            })
            .expect("request create");

        let updated = service
            .update_request(yaku_domain::UpdateRequest {
                id: request.id.clone(),
                name: Some("Ping".to_string()),
                description: None,
                config: None,
                now,
            })
            .expect("request update");
        assert_eq!(updated.name, "Ping");

        let moved = service
            .move_request_node(yaku_domain::MoveRequestNode {
                id: "node_v2".to_string(),
                parent_id: None,
                sort_key: "z".to_string(),
                now,
            })
            .expect("node move");
        assert_eq!(moved.parent_id, None);

        let store = service.into_inner();
        let tree = store.list_request_tree(&workspace.id).expect("tree read");
        assert_eq!(tree.len(), 2);
        let request_node = tree.iter().find(|node| node.id == "node_v2").expect("request node");
        assert_eq!(request_node.name, "Ping");
        assert_eq!(request_node.sort_key, "z");
    }

    #[test]
    fn deletes_workspace_cascade() {
        let store = Store::open_in_memory().expect("store opens");
        let now = Utc::now();
        let workspace = Workspace {
            id: "wk_v2".to_string(),
            name: "Yaku".to_string(),
            description: String::new(),
            created_at: now,
            updated_at: now,
        };
        store.upsert_workspace(&workspace).expect("workspace upsert");

        let request = Request {
            id: "rq_v2".to_string(),
            workspace_id: workspace.id.clone(),
            protocol: Protocol::Http,
            name: "Health".to_string(),
            description: String::new(),
            config: BTreeMap::new(),
            created_at: now,
            updated_at: now,
        };
        let node = RequestNode {
            id: "node_v2".to_string(),
            workspace_id: workspace.id.clone(),
            parent_id: None,
            request_id: Some(request.id.clone()),
            kind: RequestNodeKind::Request,
            name: request.name.clone(),
            sort_key: "a".to_string(),
            created_at: now,
            updated_at: now,
        };
        store.upsert_request(&request, &node).expect("request upsert");
        let run = Run {
            id: "run_v2".to_string(),
            workspace_id: workspace.id.clone(),
            request_id: request.id.clone(),
            protocol: Protocol::Http,
            state: RunState::Running,
            started_at: now,
            completed_at: None,
            status_code: None,
            error: None,
        };
        store.upsert_run(&run).expect("run upsert");

        assert!(store.delete_workspace(&workspace.id).expect("workspace delete"));
        assert!(store.get_workspace(&workspace.id).expect("workspace read").is_none());
        assert!(store.get_request(&request.id).expect("request read").is_none());
        assert!(
            store
                .list_runs_for_request(&request.id, Page::first(10))
                .expect("run history")
                .is_empty()
        );
    }

    #[test]
    fn stores_environment_setting_secret_and_body_metadata() {
        let store = Store::open_in_memory().expect("store opens");
        let now = Utc::now();
        let workspace = Workspace {
            id: "wk_v2".to_string(),
            name: "Yaku".to_string(),
            description: String::new(),
            created_at: now,
            updated_at: now,
        };
        store.upsert_workspace(&workspace).expect("workspace upsert");

        let mut variables = BTreeMap::new();
        variables.insert("base_url".to_string(), json!("https://example.test"));
        let environment = Environment {
            id: "env_v2".to_string(),
            workspace_id: workspace.id.clone(),
            name: "Local".to_string(),
            variables,
            created_at: now,
            updated_at: now,
        };
        store.upsert_environment(&environment).expect("environment upsert");
        let environments = store.list_environments(&workspace.id).expect("environment list");
        assert_eq!(environments.len(), 1);
        assert_eq!(environments[0].variables.get("base_url"), Some(&json!("https://example.test")));
        assert_eq!(
            store
                .get_environment(&environment.id)
                .expect("environment read")
                .expect("environment")
                .name,
            "Local"
        );
        assert!(store.delete_environment(&environment.id).expect("environment delete"));
        assert!(store.get_environment(&environment.id).expect("environment read").is_none());

        let setting = Setting {
            key: "appearance".to_string(),
            value: json!({ "theme": "system" }),
            updated_at: now,
        };
        store.upsert_setting(&setting).expect("setting upsert");
        let loaded_setting = store.get_setting("appearance").expect("setting read").unwrap();
        assert_eq!(loaded_setting.value["theme"], json!("system"));
        assert!(store.delete_setting("appearance").expect("setting delete"));
        assert!(store.get_setting("appearance").expect("setting read").is_none());

        let mut metadata = BTreeMap::new();
        metadata.insert("algorithm".to_string(), json!("v2-local-keychain"));
        let secret = SecretMetadata {
            id: "sec_v2".to_string(),
            workspace_id: workspace.id.clone(),
            name: "API token".to_string(),
            ciphertext: "encrypted".to_string(),
            metadata,
            created_at: now,
            updated_at: now,
        };
        store.upsert_secret_metadata(&secret).expect("secret upsert");
        let secrets = store.list_secret_metadata(&workspace.id).expect("secret list");
        assert_eq!(secrets.len(), 1);
        assert_eq!(secrets[0].name, "API token");

        let request = Request {
            id: "rq_v2".to_string(),
            workspace_id: workspace.id.clone(),
            protocol: Protocol::Http,
            name: "Health".to_string(),
            description: String::new(),
            config: BTreeMap::new(),
            created_at: now,
            updated_at: now,
        };
        let node = RequestNode {
            id: "node_v2".to_string(),
            workspace_id: workspace.id.clone(),
            parent_id: None,
            request_id: Some(request.id.clone()),
            kind: RequestNodeKind::Request,
            name: request.name.clone(),
            sort_key: "a".to_string(),
            created_at: now,
            updated_at: now,
        };
        store.upsert_request(&request, &node).expect("request upsert");
        let run = Run {
            id: "run_v2".to_string(),
            workspace_id: workspace.id.clone(),
            request_id: request.id.clone(),
            protocol: Protocol::Http,
            state: RunState::Running,
            started_at: now,
            completed_at: None,
            status_code: None,
            error: None,
        };
        store.upsert_run(&run).expect("run upsert");
        let event_id = store
            .append_run_event(&RunEvent {
                id: 0,
                run_id: run.id.clone(),
                workspace_id: workspace.id.clone(),
                sequence: 0,
                kind: RunEventKind::ResponseBody,
                data: BTreeMap::new(),
                created_at: now,
            })
            .expect("event append");
        let body = RunBody {
            id: "body_v2".to_string(),
            run_id: run.id.clone(),
            workspace_id: workspace.id.clone(),
            event_id: Some(event_id),
            body_role: BodyRole::Response,
            content_type: Some("application/json".to_string()),
            byte_length: 42,
            storage_kind: BodyStorageKind::Blob,
            storage_ref: "blob:body_v2".to_string(),
            created_at: now,
        };
        store.upsert_run_body(&body).expect("body upsert");
        let bodies = store.list_run_bodies(&run.id).expect("body list");
        assert_eq!(bodies.len(), 1);
        assert_eq!(bodies[0].byte_length, 42);
        assert_eq!(bodies[0].storage_kind, BodyStorageKind::Blob);
    }

    #[test]
    fn stores_runs_and_reads_events_by_cursor() {
        let store = Store::open_in_memory().expect("store opens");
        let now = Utc::now();
        let workspace = Workspace {
            id: "wk_v2".to_string(),
            name: "Yaku".to_string(),
            description: String::new(),
            created_at: now,
            updated_at: now,
        };
        store.upsert_workspace(&workspace).expect("workspace upsert");

        let request = Request {
            id: "rq_v2".to_string(),
            workspace_id: workspace.id.clone(),
            protocol: Protocol::Http,
            name: "Health".to_string(),
            description: String::new(),
            config: BTreeMap::new(),
            created_at: now,
            updated_at: now,
        };
        let node = RequestNode {
            id: "node_v2".to_string(),
            workspace_id: workspace.id.clone(),
            parent_id: None,
            request_id: Some(request.id.clone()),
            kind: RequestNodeKind::Request,
            name: request.name.clone(),
            sort_key: "a".to_string(),
            created_at: now,
            updated_at: now,
        };
        store.upsert_request(&request, &node).expect("request upsert");

        let run = Run {
            id: "run_v2".to_string(),
            workspace_id: workspace.id.clone(),
            request_id: request.id.clone(),
            protocol: Protocol::Http,
            state: RunState::Running,
            started_at: now,
            completed_at: None,
            status_code: None,
            error: None,
        };
        store.upsert_run(&run).expect("run upsert");

        for sequence in 0..3 {
            let mut data = BTreeMap::new();
            data.insert("message".to_string(), json!(format!("event-{sequence}")));
            store
                .append_run_event(&RunEvent {
                    id: 0,
                    run_id: run.id.clone(),
                    workspace_id: workspace.id.clone(),
                    sequence,
                    kind: RunEventKind::Log,
                    data,
                    created_at: now,
                })
                .expect("event append");
        }
        for sequence in [10_i64, 11] {
            let mut data = BTreeMap::new();
            data.insert("config".to_string(), json!({ "url": format!("https://{sequence}.test") }));
            store
                .append_run_event(&RunEvent {
                    id: 0,
                    run_id: run.id.clone(),
                    workspace_id: workspace.id.clone(),
                    sequence,
                    kind: RunEventKind::RequestSnapshot,
                    data,
                    created_at: now,
                })
                .expect("snapshot append");
        }

        let first_page = store.list_run_events(&run.id, Page::first(2)).expect("first page");
        assert_eq!(first_page.len(), 2);
        assert_eq!(first_page[0].sequence, 0);
        assert_eq!(first_page[1].sequence, 1);

        let second_page = store
            .list_run_events(&run.id, Page { cursor: Some(first_page[1].id), limit: 2 })
            .expect("second page");
        assert_eq!(second_page.len(), 2);
        assert_eq!(second_page[0].sequence, 2);
        assert_eq!(second_page[1].sequence, 10);
        let snapshot = store
            .latest_run_event_by_kind(&run.id, RunEventKind::RequestSnapshot)
            .expect("snapshot query")
            .expect("snapshot");
        assert_eq!(snapshot.sequence, 11);
        assert_eq!(snapshot.data["config"]["url"], json!("https://11.test"));
        let snapshots = store
            .list_run_events_by_kind(&run.id, RunEventKind::RequestSnapshot, Page::first(10))
            .expect("snapshots query");
        assert_eq!(snapshots.len(), 2);
        assert!(snapshots.iter().all(|event| event.kind == RunEventKind::RequestSnapshot));

        let completed = Run {
            state: RunState::Completed,
            completed_at: Some(now),
            status_code: Some(200),
            ..run
        };
        store.upsert_run(&completed).expect("run update");
        let runs = store.list_runs_for_request(&request.id, Page::first(10)).expect("run history");
        assert_eq!(runs.len(), 1);
        assert_eq!(runs[0].state, RunState::Completed);
        assert_eq!(runs[0].status_code, Some(200));

        let workspace_runs =
            store.list_runs_for_workspace(&workspace.id, Page::first(10)).expect("workspace runs");
        assert_eq!(workspace_runs.len(), 1);
        assert_eq!(workspace_runs[0].id, "run_v2");

        assert!(store.delete_run("run_v2").expect("run delete"));
        assert!(store.get_run("run_v2").expect("run read").is_none());
        assert!(store.list_run_events("run_v2", Page::first(10)).expect("events").is_empty());
    }

    #[test]
    fn prunes_old_runs_and_cascades_events_and_bodies() {
        let store = Store::open_in_memory().expect("store opens");
        let service = DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: "Yaku".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        let request = service
            .create_request(CreateRequest {
                id: "rq_v2".to_string(),
                node_id: "node_v2".to_string(),
                workspace_id: workspace.id.clone(),
                parent_id: None,
                protocol: Protocol::Http,
                name: "Health".to_string(),
                description: String::new(),
                config: BTreeMap::new(),
                sort_key: "a".to_string(),
                now,
            })
            .expect("request create");

        for index in 0..3 {
            let run = service
                .create_run(CreateRun {
                    id: format!("run_{index}"),
                    request_id: request.id.clone(),
                    now: now + chrono::TimeDelta::seconds(index),
                })
                .expect("run create");
            let event = service
                .append_run_event(yaku_domain::AppendRunEvent {
                    run_id: run.id.clone(),
                    sequence: 0,
                    kind: RunEventKind::ResponseBody,
                    data: BTreeMap::new(),
                    now,
                })
                .expect("event append");
            service
                .record_run_body(yaku_domain::RecordRunBody {
                    id: format!("body_{index}"),
                    run_id: run.id,
                    event_id: Some(event.id),
                    body_role: BodyRole::Response,
                    content_type: None,
                    byte_length: 1,
                    storage_kind: BodyStorageKind::Inline,
                    storage_ref: "inline:x".to_string(),
                    now,
                })
                .expect("body record");
        }

        let deleted = service
            .prune_runs(yaku_domain::PruneRuns {
                scope: yaku_domain::PruneRunsScope::Request { request_id: request.id.clone() },
                keep_last: 1,
            })
            .expect("prune runs");
        assert_eq!(deleted, 2);

        let store = service.into_inner();
        let runs = store.list_runs_for_request(&request.id, Page::first(10)).expect("runs");
        assert_eq!(runs.len(), 1);
        assert_eq!(runs[0].id, "run_2");
        assert!(store.list_run_events("run_0", Page::first(10)).expect("events").is_empty());
        assert!(store.list_run_bodies("run_0").expect("bodies").is_empty());
    }

    #[test]
    fn domain_service_runs_on_sqlite_store() {
        let store = Store::open_in_memory().expect("store opens");
        let service = DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        let request = service
            .create_request(CreateRequest {
                id: "rq_v2".to_string(),
                node_id: "node_v2".to_string(),
                workspace_id: workspace.id.clone(),
                parent_id: None,
                protocol: Protocol::Graphql,
                name: "GraphQL".to_string(),
                description: String::new(),
                config: BTreeMap::new(),
                sort_key: "a".to_string(),
                now,
            })
            .expect("request create");

        let store = service.into_inner();
        let tree = store.list_request_tree(&workspace.id).expect("tree read");
        assert_eq!(tree.len(), 1);
        assert_eq!(tree[0].request_id.as_deref(), Some(request.id.as_str()));
    }

    #[test]
    fn domain_service_manages_sqlite_run_lifecycle() {
        let store = Store::open_in_memory().expect("store opens");
        let service = DomainService::new(store);
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace create");
        let request = service
            .create_request(CreateRequest {
                id: "rq_v2".to_string(),
                node_id: "node_v2".to_string(),
                workspace_id: workspace.id,
                parent_id: None,
                protocol: Protocol::Http,
                name: "Health".to_string(),
                description: String::new(),
                config: BTreeMap::new(),
                sort_key: "a".to_string(),
                now,
            })
            .expect("request create");
        let run = service
            .create_run(CreateRun { id: "run_v2".to_string(), request_id: request.id.clone(), now })
            .expect("run create");

        let event = service
            .append_run_event(AppendRunEvent {
                run_id: run.id.clone(),
                sequence: 0,
                kind: RunEventKind::ResponseHeaders,
                data: BTreeMap::new(),
                now,
            })
            .expect("event append");
        assert!(event.id > 0);

        let completed = service
            .finish_run(FinishRun {
                run_id: run.id.clone(),
                state: RunState::Completed,
                status_code: Some(204),
                error: None,
                now,
            })
            .expect("run finish");
        assert_eq!(completed.status_code, Some(204));

        let store = service.into_inner();
        let runs = store.list_runs_for_request(&request.id, Page::first(10)).expect("run history");
        assert_eq!(runs.len(), 1);
        assert_eq!(runs[0].state, RunState::Completed);
        let events = store.list_run_events(&run.id, Page::first(10)).expect("events");
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].kind, RunEventKind::ResponseHeaders);
    }
}
