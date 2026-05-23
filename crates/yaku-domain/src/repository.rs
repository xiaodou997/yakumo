use crate::error::Result;
use crate::models::{
    CookieJar, CookieRecord, Environment, Page, Request, RequestNode, Run, RunBody, RunEvent,
    RunEventKind, Workspace,
};

pub trait WorkspaceRepository {
    fn upsert_workspace(&self, workspace: &Workspace) -> Result<()>;
    fn get_workspace(&self, id: &str) -> Result<Option<Workspace>>;
    fn list_workspaces(&self) -> Result<Vec<Workspace>>;
    fn delete_workspace(&self, id: &str) -> Result<bool>;
}

pub trait RequestRepository {
    fn upsert_request(&self, request: &Request, node: &RequestNode) -> Result<()>;
    fn upsert_request_node(&self, node: &RequestNode) -> Result<()>;
    fn get_request(&self, id: &str) -> Result<Option<Request>>;
    fn get_request_node(&self, id: &str) -> Result<Option<RequestNode>>;
    fn list_request_tree(&self, workspace_id: &str) -> Result<Vec<RequestNode>>;
    fn delete_request_node(&self, id: &str) -> Result<bool>;
}

pub trait EnvironmentRepository {
    fn upsert_environment(&self, environment: &Environment) -> Result<()>;
    fn get_environment(&self, id: &str) -> Result<Option<Environment>>;
    fn list_environments(&self, workspace_id: &str) -> Result<Vec<Environment>>;
    fn delete_environment(&self, id: &str) -> Result<bool>;
}

pub trait CookieRepository {
    fn upsert_cookie_jar(&self, jar: &CookieJar) -> Result<()>;
    fn get_cookie_jar(&self, id: &str) -> Result<Option<CookieJar>>;
    fn list_cookie_jars(&self, workspace_id: &str) -> Result<Vec<CookieJar>>;
    fn delete_cookie_jar(&self, id: &str) -> Result<bool>;
    fn upsert_cookie(&self, cookie: &CookieRecord) -> Result<()>;
    fn list_cookies(&self, jar_id: &str) -> Result<Vec<CookieRecord>>;
    fn delete_cookie(&self, id: &str) -> Result<bool>;
    fn clear_cookies_for_jar(&self, jar_id: &str) -> Result<u64>;
}

pub trait RunRepository {
    fn upsert_run(&self, run: &Run) -> Result<()>;
    fn get_run(&self, id: &str) -> Result<Option<Run>>;
    fn list_runs_for_request(&self, request_id: &str, page: Page) -> Result<Vec<Run>>;
    fn list_runs_for_workspace(&self, workspace_id: &str, page: Page) -> Result<Vec<Run>>;
    fn delete_run(&self, id: &str) -> Result<bool>;
    fn prune_runs_for_request(&self, request_id: &str, keep_last: u32) -> Result<u64>;
    fn prune_runs_for_workspace(&self, workspace_id: &str, keep_last: u32) -> Result<u64>;
    fn append_run_event(&self, event: &RunEvent) -> Result<i64>;
    fn list_run_events(&self, run_id: &str, page: Page) -> Result<Vec<RunEvent>>;
    fn list_run_events_by_kind(
        &self,
        run_id: &str,
        kind: RunEventKind,
        page: Page,
    ) -> Result<Vec<RunEvent>>;
    fn latest_run_event_by_kind(
        &self,
        run_id: &str,
        kind: RunEventKind,
    ) -> Result<Option<RunEvent>>;
}

pub trait RunBodyRepository {
    fn upsert_run_body(&self, body: &RunBody) -> Result<()>;
    fn list_run_bodies(&self, run_id: &str) -> Result<Vec<RunBody>>;
}
