use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use ts_rs::TS;

pub type DomainId = String;

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "gen_domain.ts")]
pub enum Protocol {
    Http,
    Graphql,
    Grpc,
    WebSocket,
    Sse,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "gen_domain.ts")]
pub enum RequestNodeKind {
    Folder,
    Request,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "gen_domain.ts")]
pub enum RunState {
    Created,
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "gen_domain.ts")]
pub enum RunEventKind {
    Log,
    Dns,
    Connect,
    Tls,
    RequestSnapshot,
    RequestHeaders,
    RequestBody,
    ResponseHeaders,
    ResponseBody,
    Message,
    Error,
    Complete,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "gen_domain.ts")]
pub enum BodyRole {
    Request,
    Response,
    Message,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "gen_domain.ts")]
pub enum BodyStorageKind {
    Inline,
    Blob,
    File,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_domain.ts")]
pub struct Workspace {
    pub id: DomainId,
    pub name: String,
    pub description: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_domain.ts")]
pub struct RequestNode {
    pub id: DomainId,
    pub workspace_id: DomainId,
    pub parent_id: Option<DomainId>,
    pub request_id: Option<DomainId>,
    pub kind: RequestNodeKind,
    pub name: String,
    pub sort_key: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_domain.ts")]
pub struct Request {
    pub id: DomainId,
    pub workspace_id: DomainId,
    pub protocol: Protocol,
    pub name: String,
    pub description: String,
    #[ts(type = "Record<string, any>")]
    pub config: BTreeMap<String, Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_domain.ts")]
pub struct Run {
    pub id: DomainId,
    pub workspace_id: DomainId,
    pub request_id: DomainId,
    pub protocol: Protocol,
    pub state: RunState,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub status_code: Option<i32>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_domain.ts")]
pub struct RunEvent {
    pub id: i64,
    pub run_id: DomainId,
    pub workspace_id: DomainId,
    pub sequence: i64,
    pub kind: RunEventKind,
    #[ts(type = "Record<string, any>")]
    pub data: BTreeMap<String, Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_domain.ts")]
pub struct Environment {
    pub id: DomainId,
    pub workspace_id: DomainId,
    pub name: String,
    #[ts(type = "Record<string, any>")]
    pub variables: BTreeMap<String, Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_domain.ts")]
pub struct Setting {
    pub key: String,
    #[ts(type = "any")]
    pub value: Value,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_domain.ts")]
pub struct SecretMetadata {
    pub id: DomainId,
    pub workspace_id: DomainId,
    pub name: String,
    pub ciphertext: String,
    #[ts(type = "Record<string, any>")]
    pub metadata: BTreeMap<String, Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_domain.ts")]
pub struct CookieJar {
    pub id: DomainId,
    pub workspace_id: DomainId,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_domain.ts")]
pub struct CookieRecord {
    pub id: DomainId,
    pub workspace_id: DomainId,
    pub jar_id: DomainId,
    pub name: String,
    pub value: String,
    pub domain: String,
    pub path: String,
    pub expires_at: Option<DateTime<Utc>>,
    pub secure: bool,
    pub http_only: bool,
    pub same_site: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_domain.ts")]
pub struct RunBody {
    pub id: DomainId,
    pub run_id: DomainId,
    pub workspace_id: DomainId,
    pub event_id: Option<i64>,
    pub body_role: BodyRole,
    pub content_type: Option<String>,
    pub byte_length: i64,
    pub storage_kind: BodyStorageKind,
    pub storage_ref: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, Eq, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_domain.ts")]
pub struct Page {
    pub cursor: Option<i64>,
    pub limit: u32,
}

impl Page {
    pub fn first(limit: u32) -> Self {
        Self { cursor: None, limit }
    }
}
