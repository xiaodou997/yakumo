use crate::error::{Error, Result};
use crate::models::{
    BodyRole, BodyStorageKind, Environment, Protocol, Request, RequestNode, RequestNodeKind, Run,
    RunBody, RunEvent, RunEventKind, RunState, Workspace,
};
use crate::repository::{
    EnvironmentRepository, RequestRepository, RunBodyRepository, RunRepository, WorkspaceRepository,
};
use chrono::{DateTime, Utc};
use serde_json::Value;
use std::collections::BTreeMap;

#[derive(Debug, Clone)]
pub struct CreateWorkspace {
    pub id: String,
    pub name: String,
    pub description: String,
    pub now: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct CreateRequest {
    pub id: String,
    pub node_id: String,
    pub workspace_id: String,
    pub parent_id: Option<String>,
    pub protocol: Protocol,
    pub name: String,
    pub description: String,
    pub config: BTreeMap<String, Value>,
    pub sort_key: String,
    pub now: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct CreateFolder {
    pub id: String,
    pub workspace_id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub sort_key: String,
    pub now: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct UpdateFolder {
    pub id: String,
    pub name: Option<String>,
    pub now: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct CreateEnvironment {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub variables: BTreeMap<String, Value>,
    pub now: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct UpdateEnvironment {
    pub id: String,
    pub name: Option<String>,
    pub variables: Option<BTreeMap<String, Value>>,
    pub now: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct DuplicateRequest {
    pub source_id: String,
    pub id: String,
    pub node_id: String,
    pub parent_id: Option<String>,
    pub name: Option<String>,
    pub sort_key: String,
    pub now: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct UpdateRequest {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub config: Option<BTreeMap<String, Value>>,
    pub now: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct MoveRequestNode {
    pub id: String,
    pub parent_id: Option<String>,
    pub sort_key: String,
    pub now: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct CreateRun {
    pub id: String,
    pub request_id: String,
    pub now: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct AppendRunEvent {
    pub run_id: String,
    pub sequence: i64,
    pub kind: RunEventKind,
    pub data: BTreeMap<String, Value>,
    pub now: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct FinishRun {
    pub run_id: String,
    pub state: RunState,
    pub status_code: Option<i32>,
    pub error: Option<String>,
    pub now: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct RecordRunBody {
    pub id: String,
    pub run_id: String,
    pub event_id: Option<i64>,
    pub body_role: BodyRole,
    pub content_type: Option<String>,
    pub byte_length: i64,
    pub storage_kind: BodyStorageKind,
    pub storage_ref: String,
    pub now: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub enum PruneRunsScope {
    Request { request_id: String },
    Workspace { workspace_id: String },
}

#[derive(Debug, Clone)]
pub struct PruneRuns {
    pub scope: PruneRunsScope,
    pub keep_last: u32,
}

pub struct DomainService<R> {
    repository: R,
}

impl<R> DomainService<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }

    pub fn into_inner(self) -> R {
        self.repository
    }

    pub fn repository(&self) -> &R {
        &self.repository
    }
}

impl<R> DomainService<R>
where
    R: WorkspaceRepository + RequestRepository + RunRepository + RunBodyRepository,
{
    pub fn create_workspace(&self, input: CreateWorkspace) -> Result<Workspace> {
        validate_id("workspace id", &input.id)?;
        validate_name("workspace name", &input.name)?;

        let workspace = Workspace {
            id: input.id,
            name: input.name.trim().to_string(),
            description: input.description,
            created_at: input.now,
            updated_at: input.now,
        };
        self.repository.upsert_workspace(&workspace)?;
        Ok(workspace)
    }

    pub fn delete_workspace(&self, id: &str) -> Result<()> {
        if self.repository.delete_workspace(id)? {
            Ok(())
        } else {
            Err(Error::NotFound(format!("workspace {id}")))
        }
    }

    pub fn create_request(&self, input: CreateRequest) -> Result<Request> {
        validate_id("request id", &input.id)?;
        validate_id("request node id", &input.node_id)?;
        validate_id("workspace id", &input.workspace_id)?;
        validate_name("request name", &input.name)?;

        if self.repository.get_workspace(&input.workspace_id)?.is_none() {
            return Err(Error::NotFound(format!("workspace {}", input.workspace_id)));
        }
        if let Some(parent_id) = &input.parent_id {
            let parent = self
                .repository
                .get_request_node(parent_id)?
                .ok_or_else(|| Error::NotFound(format!("parent request node {parent_id}")))?;
            validate_parent_node(&input.workspace_id, &parent)?;
        }

        let request = Request {
            id: input.id,
            workspace_id: input.workspace_id.clone(),
            protocol: input.protocol,
            name: input.name.trim().to_string(),
            description: input.description,
            config: input.config,
            created_at: input.now,
            updated_at: input.now,
        };
        let node = RequestNode {
            id: input.node_id,
            workspace_id: input.workspace_id,
            parent_id: input.parent_id,
            request_id: Some(request.id.clone()),
            kind: RequestNodeKind::Request,
            name: request.name.clone(),
            sort_key: input.sort_key,
            created_at: input.now,
            updated_at: input.now,
        };
        self.repository.upsert_request(&request, &node)?;
        Ok(request)
    }

    pub fn create_folder(&self, input: CreateFolder) -> Result<RequestNode> {
        validate_id("folder id", &input.id)?;
        validate_id("workspace id", &input.workspace_id)?;
        validate_name("folder name", &input.name)?;

        if self.repository.get_workspace(&input.workspace_id)?.is_none() {
            return Err(Error::NotFound(format!("workspace {}", input.workspace_id)));
        }
        if let Some(parent_id) = &input.parent_id {
            let parent = self
                .repository
                .get_request_node(parent_id)?
                .ok_or_else(|| Error::NotFound(format!("parent request node {parent_id}")))?;
            validate_parent_node(&input.workspace_id, &parent)?;
        }

        let node = RequestNode {
            id: input.id,
            workspace_id: input.workspace_id,
            parent_id: input.parent_id,
            request_id: None,
            kind: RequestNodeKind::Folder,
            name: input.name.trim().to_string(),
            sort_key: input.sort_key,
            created_at: input.now,
            updated_at: input.now,
        };
        self.repository.upsert_request_node(&node)?;
        Ok(node)
    }

    pub fn update_folder(&self, input: UpdateFolder) -> Result<RequestNode> {
        validate_id("folder id", &input.id)?;
        let mut node = self
            .repository
            .get_request_node(&input.id)?
            .ok_or_else(|| Error::NotFound(format!("request node {}", input.id)))?;

        if node.kind != RequestNodeKind::Folder {
            return Err(Error::InvalidInput("request node must be a folder".to_string()));
        }
        if let Some(name) = input.name {
            validate_name("folder name", &name)?;
            node.name = name.trim().to_string();
        }
        node.updated_at = input.now;
        self.repository.upsert_request_node(&node)?;
        Ok(node)
    }

    pub fn duplicate_request(&self, input: DuplicateRequest) -> Result<Request> {
        validate_id("source request id", &input.source_id)?;
        validate_id("request id", &input.id)?;
        validate_id("request node id", &input.node_id)?;

        let source = self
            .repository
            .get_request(&input.source_id)?
            .ok_or_else(|| Error::NotFound(format!("request {}", input.source_id)))?;
        if let Some(parent_id) = &input.parent_id {
            let parent = self
                .repository
                .get_request_node(parent_id)?
                .ok_or_else(|| Error::NotFound(format!("parent request node {parent_id}")))?;
            validate_parent_node(&source.workspace_id, &parent)?;
        }

        let name = input.name.unwrap_or_else(|| format!("{} Copy", source.name));
        validate_name("request name", &name)?;
        let request = Request {
            id: input.id,
            workspace_id: source.workspace_id.clone(),
            protocol: source.protocol,
            name: name.trim().to_string(),
            description: source.description,
            config: source.config,
            created_at: input.now,
            updated_at: input.now,
        };
        let node = RequestNode {
            id: input.node_id,
            workspace_id: source.workspace_id,
            parent_id: input.parent_id,
            request_id: Some(request.id.clone()),
            kind: RequestNodeKind::Request,
            name: request.name.clone(),
            sort_key: input.sort_key,
            created_at: input.now,
            updated_at: input.now,
        };
        self.repository.upsert_request(&request, &node)?;
        Ok(request)
    }

    pub fn update_request(&self, input: UpdateRequest) -> Result<Request> {
        validate_id("request id", &input.id)?;
        let mut request = self
            .repository
            .get_request(&input.id)?
            .ok_or_else(|| Error::NotFound(format!("request {}", input.id)))?;

        if let Some(name) = input.name {
            validate_name("request name", &name)?;
            request.name = name.trim().to_string();
        }
        if let Some(description) = input.description {
            request.description = description;
        }
        if let Some(config) = input.config {
            request.config = config;
        }
        request.updated_at = input.now;

        let mut node = self
            .request_node_for_request(&request.workspace_id, &request.id)?
            .ok_or_else(|| Error::NotFound(format!("request node for request {}", request.id)))?;
        node.name = request.name.clone();
        node.updated_at = input.now;
        self.repository.upsert_request(&request, &node)?;
        Ok(request)
    }

    pub fn move_request_node(&self, input: MoveRequestNode) -> Result<RequestNode> {
        validate_id("request node id", &input.id)?;
        let mut node = self
            .repository
            .get_request_node(&input.id)?
            .ok_or_else(|| Error::NotFound(format!("request node {}", input.id)))?;

        if let Some(parent_id) = &input.parent_id {
            if parent_id == &node.id {
                return Err(Error::InvalidInput(
                    "request node cannot be its own parent".to_string(),
                ));
            }
            let parent = self
                .repository
                .get_request_node(parent_id)?
                .ok_or_else(|| Error::NotFound(format!("parent request node {parent_id}")))?;
            validate_parent_node(&node.workspace_id, &parent)?;
            self.ensure_not_descendant_parent(&node, parent_id)?;
        }

        node.parent_id = input.parent_id;
        node.sort_key = input.sort_key;
        node.updated_at = input.now;
        self.repository.upsert_request_node(&node)?;
        Ok(node)
    }

    pub fn delete_request_node(&self, id: &str) -> Result<()> {
        validate_id("request node id", id)?;
        if self.repository.delete_request_node(id)? {
            Ok(())
        } else {
            Err(Error::NotFound(format!("request node {id}")))
        }
    }

    pub fn create_run(&self, input: CreateRun) -> Result<Run> {
        validate_id("run id", &input.id)?;
        validate_id("request id", &input.request_id)?;

        let request = self
            .repository
            .get_request(&input.request_id)?
            .ok_or_else(|| Error::NotFound(format!("request {}", input.request_id)))?;

        let run = Run {
            id: input.id,
            workspace_id: request.workspace_id,
            request_id: request.id,
            protocol: request.protocol,
            state: RunState::Running,
            started_at: input.now,
            completed_at: None,
            status_code: None,
            error: None,
        };
        self.repository.upsert_run(&run)?;
        Ok(run)
    }

    pub fn append_run_event(&self, input: AppendRunEvent) -> Result<RunEvent> {
        validate_id("run id", &input.run_id)?;
        if input.sequence < 0 {
            return Err(Error::InvalidInput("run event sequence cannot be negative".to_string()));
        }

        let run = self
            .repository
            .get_run(&input.run_id)?
            .ok_or_else(|| Error::NotFound(format!("run {}", input.run_id)))?;

        if run.state != RunState::Running {
            return Err(Error::InvalidInput(format!("cannot append event to {:?} run", run.state)));
        }

        let mut event = RunEvent {
            id: 0,
            run_id: run.id,
            workspace_id: run.workspace_id,
            sequence: input.sequence,
            kind: input.kind,
            data: input.data,
            created_at: input.now,
        };
        event.id = self.repository.append_run_event(&event)?;
        Ok(event)
    }

    pub fn finish_run(&self, input: FinishRun) -> Result<Run> {
        let mut run = self
            .repository
            .get_run(&input.run_id)?
            .ok_or_else(|| Error::NotFound(format!("run {}", input.run_id)))?;

        if matches!(run.state, RunState::Completed | RunState::Failed | RunState::Cancelled) {
            return Ok(run);
        }

        match input.state {
            RunState::Completed | RunState::Failed | RunState::Cancelled => {}
            RunState::Created | RunState::Running => {
                return Err(Error::InvalidInput(
                    "finish_run requires completed, failed, or cancelled state".to_string(),
                ));
            }
        }

        run.state = input.state;
        run.completed_at = Some(input.now);
        run.status_code = input.status_code;
        run.error = input.error;
        self.repository.upsert_run(&run)?;
        Ok(run)
    }

    pub fn delete_run(&self, id: &str) -> Result<()> {
        validate_id("run id", id)?;
        if self.repository.delete_run(id)? {
            Ok(())
        } else {
            Err(Error::NotFound(format!("run {id}")))
        }
    }

    pub fn prune_runs(&self, input: PruneRuns) -> Result<u64> {
        match input.scope {
            PruneRunsScope::Request { request_id } => {
                validate_id("request id", &request_id)?;
                if self.repository.get_request(&request_id)?.is_none() {
                    return Err(Error::NotFound(format!("request {request_id}")));
                }
                self.repository.prune_runs_for_request(&request_id, input.keep_last)
            }
            PruneRunsScope::Workspace { workspace_id } => {
                validate_id("workspace id", &workspace_id)?;
                if self.repository.get_workspace(&workspace_id)?.is_none() {
                    return Err(Error::NotFound(format!("workspace {workspace_id}")));
                }
                self.repository.prune_runs_for_workspace(&workspace_id, input.keep_last)
            }
        }
    }

    pub fn record_run_body(&self, input: RecordRunBody) -> Result<RunBody> {
        validate_id("run body id", &input.id)?;
        validate_id("run id", &input.run_id)?;
        if input.byte_length < 0 {
            return Err(Error::InvalidInput("run body byte length cannot be negative".to_string()));
        }
        if input.storage_ref.trim().is_empty() {
            return Err(Error::InvalidInput("run body storage ref cannot be empty".to_string()));
        }

        let run = self
            .repository
            .get_run(&input.run_id)?
            .ok_or_else(|| Error::NotFound(format!("run {}", input.run_id)))?;

        let body = RunBody {
            id: input.id,
            run_id: run.id,
            workspace_id: run.workspace_id,
            event_id: input.event_id,
            body_role: input.body_role,
            content_type: input.content_type,
            byte_length: input.byte_length,
            storage_kind: input.storage_kind,
            storage_ref: input.storage_ref,
            created_at: input.now,
        };
        self.repository.upsert_run_body(&body)?;
        Ok(body)
    }

    fn request_node_for_request(
        &self,
        workspace_id: &str,
        request_id: &str,
    ) -> Result<Option<RequestNode>> {
        Ok(self
            .repository
            .list_request_tree(workspace_id)?
            .into_iter()
            .find(|node| node.request_id.as_deref() == Some(request_id)))
    }

    fn ensure_not_descendant_parent(&self, node: &RequestNode, parent_id: &str) -> Result<()> {
        let tree = self.repository.list_request_tree(&node.workspace_id)?;
        let mut current = Some(parent_id.to_string());
        while let Some(current_id) = current {
            if current_id == node.id {
                return Err(Error::InvalidInput(
                    "request node cannot be moved under its descendant".to_string(),
                ));
            }
            current = tree
                .iter()
                .find(|candidate| candidate.id == current_id)
                .and_then(|candidate| candidate.parent_id.clone());
        }
        Ok(())
    }
}

impl<R> DomainService<R>
where
    R: WorkspaceRepository + EnvironmentRepository,
{
    pub fn create_environment(&self, input: CreateEnvironment) -> Result<Environment> {
        validate_id("environment id", &input.id)?;
        validate_id("workspace id", &input.workspace_id)?;
        validate_name("environment name", &input.name)?;

        if self.repository.get_workspace(&input.workspace_id)?.is_none() {
            return Err(Error::NotFound(format!("workspace {}", input.workspace_id)));
        }

        let environment = Environment {
            id: input.id,
            workspace_id: input.workspace_id,
            name: input.name.trim().to_string(),
            variables: input.variables,
            created_at: input.now,
            updated_at: input.now,
        };
        self.repository.upsert_environment(&environment)?;
        Ok(environment)
    }

    pub fn update_environment(&self, input: UpdateEnvironment) -> Result<Environment> {
        validate_id("environment id", &input.id)?;
        let mut environment = self
            .repository
            .get_environment(&input.id)?
            .ok_or_else(|| Error::NotFound(format!("environment {}", input.id)))?;

        if let Some(name) = input.name {
            validate_name("environment name", &name)?;
            environment.name = name.trim().to_string();
        }
        if let Some(variables) = input.variables {
            environment.variables = variables;
        }
        environment.updated_at = input.now;
        self.repository.upsert_environment(&environment)?;
        Ok(environment)
    }

    pub fn delete_environment(&self, id: &str) -> Result<()> {
        validate_id("environment id", id)?;
        if self.repository.delete_environment(id)? {
            Ok(())
        } else {
            Err(Error::NotFound(format!("environment {id}")))
        }
    }
}

fn validate_id(label: &str, value: &str) -> Result<()> {
    if value.trim().is_empty() {
        return Err(Error::InvalidInput(format!("{label} cannot be empty")));
    }
    Ok(())
}

fn validate_name(label: &str, value: &str) -> Result<()> {
    if value.trim().is_empty() {
        return Err(Error::InvalidInput(format!("{label} cannot be empty")));
    }
    Ok(())
}

fn validate_parent_node(workspace_id: &str, parent: &RequestNode) -> Result<()> {
    if parent.workspace_id != workspace_id {
        return Err(Error::InvalidInput(
            "parent request node must belong to the same workspace".to_string(),
        ));
    }
    if parent.kind != RequestNodeKind::Folder {
        return Err(Error::InvalidInput("parent request node must be a folder".to_string()));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Page;
    use crate::repository::{
        EnvironmentRepository, RequestRepository, RunBodyRepository, RunRepository,
        WorkspaceRepository,
    };
    use serde_json::json;
    use std::cell::RefCell;

    #[derive(Default)]
    struct MemoryRepository {
        workspaces: RefCell<BTreeMap<String, Workspace>>,
        environments: RefCell<BTreeMap<String, Environment>>,
        requests: RefCell<BTreeMap<String, Request>>,
        nodes: RefCell<BTreeMap<String, RequestNode>>,
        runs: RefCell<BTreeMap<String, Run>>,
        run_events: RefCell<Vec<RunEvent>>,
        run_bodies: RefCell<BTreeMap<String, RunBody>>,
    }

    impl WorkspaceRepository for MemoryRepository {
        fn upsert_workspace(&self, workspace: &Workspace) -> Result<()> {
            self.workspaces.borrow_mut().insert(workspace.id.clone(), workspace.clone());
            Ok(())
        }

        fn get_workspace(&self, id: &str) -> Result<Option<Workspace>> {
            Ok(self.workspaces.borrow().get(id).cloned())
        }

        fn list_workspaces(&self) -> Result<Vec<Workspace>> {
            Ok(self.workspaces.borrow().values().cloned().collect())
        }

        fn delete_workspace(&self, id: &str) -> Result<bool> {
            Ok(self.workspaces.borrow_mut().remove(id).is_some())
        }
    }

    impl RequestRepository for MemoryRepository {
        fn upsert_request(&self, request: &Request, node: &RequestNode) -> Result<()> {
            self.requests.borrow_mut().insert(request.id.clone(), request.clone());
            self.nodes.borrow_mut().insert(node.id.clone(), node.clone());
            Ok(())
        }

        fn upsert_request_node(&self, node: &RequestNode) -> Result<()> {
            self.nodes.borrow_mut().insert(node.id.clone(), node.clone());
            Ok(())
        }

        fn get_request(&self, id: &str) -> Result<Option<Request>> {
            Ok(self.requests.borrow().get(id).cloned())
        }

        fn get_request_node(&self, id: &str) -> Result<Option<RequestNode>> {
            Ok(self.nodes.borrow().get(id).cloned())
        }

        fn list_request_tree(&self, workspace_id: &str) -> Result<Vec<RequestNode>> {
            Ok(self
                .nodes
                .borrow()
                .values()
                .filter(|node| node.workspace_id == workspace_id)
                .cloned()
                .collect())
        }

        fn delete_request_node(&self, id: &str) -> Result<bool> {
            let node = self.nodes.borrow_mut().remove(id);
            if let Some(node) = &node
                && let Some(request_id) = &node.request_id
            {
                self.requests.borrow_mut().remove(request_id);
            }
            Ok(node.is_some())
        }
    }

    impl EnvironmentRepository for MemoryRepository {
        fn upsert_environment(&self, environment: &Environment) -> Result<()> {
            self.environments.borrow_mut().insert(environment.id.clone(), environment.clone());
            Ok(())
        }

        fn get_environment(&self, id: &str) -> Result<Option<Environment>> {
            Ok(self.environments.borrow().get(id).cloned())
        }

        fn list_environments(&self, workspace_id: &str) -> Result<Vec<Environment>> {
            Ok(self
                .environments
                .borrow()
                .values()
                .filter(|environment| environment.workspace_id == workspace_id)
                .cloned()
                .collect())
        }

        fn delete_environment(&self, id: &str) -> Result<bool> {
            Ok(self.environments.borrow_mut().remove(id).is_some())
        }
    }

    impl RunRepository for MemoryRepository {
        fn upsert_run(&self, run: &Run) -> Result<()> {
            self.runs.borrow_mut().insert(run.id.clone(), run.clone());
            Ok(())
        }

        fn get_run(&self, id: &str) -> Result<Option<Run>> {
            Ok(self.runs.borrow().get(id).cloned())
        }

        fn list_runs_for_request(&self, request_id: &str, _page: crate::Page) -> Result<Vec<Run>> {
            Ok(self
                .runs
                .borrow()
                .values()
                .filter(|run| run.request_id == request_id)
                .cloned()
                .collect())
        }

        fn list_runs_for_workspace(
            &self,
            workspace_id: &str,
            _page: crate::Page,
        ) -> Result<Vec<Run>> {
            Ok(self
                .runs
                .borrow()
                .values()
                .filter(|run| run.workspace_id == workspace_id)
                .cloned()
                .collect())
        }

        fn delete_run(&self, id: &str) -> Result<bool> {
            Ok(self.runs.borrow_mut().remove(id).is_some())
        }

        fn prune_runs_for_request(&self, request_id: &str, keep_last: u32) -> Result<u64> {
            let mut runs = self.list_runs_for_request(request_id, Page::first(500))?;
            runs.sort_by(|left, right| right.started_at.cmp(&left.started_at));
            let deleted_ids =
                runs.into_iter().skip(keep_last as usize).map(|run| run.id).collect::<Vec<_>>();
            let deleted = deleted_ids.len() as u64;
            for id in deleted_ids {
                self.runs.borrow_mut().remove(&id);
            }
            Ok(deleted)
        }

        fn prune_runs_for_workspace(&self, workspace_id: &str, keep_last: u32) -> Result<u64> {
            let mut runs = self.list_runs_for_workspace(workspace_id, Page::first(500))?;
            runs.sort_by(|left, right| right.started_at.cmp(&left.started_at));
            let deleted_ids =
                runs.into_iter().skip(keep_last as usize).map(|run| run.id).collect::<Vec<_>>();
            let deleted = deleted_ids.len() as u64;
            for id in deleted_ids {
                self.runs.borrow_mut().remove(&id);
            }
            Ok(deleted)
        }

        fn append_run_event(&self, event: &RunEvent) -> Result<i64> {
            let mut event = event.clone();
            event.id = self.run_events.borrow().len() as i64 + 1;
            let id = event.id;
            self.run_events.borrow_mut().push(event);
            Ok(id)
        }

        fn list_run_events(&self, run_id: &str, _page: crate::Page) -> Result<Vec<RunEvent>> {
            Ok(self
                .run_events
                .borrow()
                .iter()
                .filter(|event| event.run_id == run_id)
                .cloned()
                .collect())
        }

        fn list_run_events_by_kind(
            &self,
            run_id: &str,
            kind: RunEventKind,
            _page: crate::Page,
        ) -> Result<Vec<RunEvent>> {
            Ok(self
                .run_events
                .borrow()
                .iter()
                .filter(|event| event.run_id == run_id && event.kind == kind)
                .cloned()
                .collect())
        }

        fn latest_run_event_by_kind(
            &self,
            run_id: &str,
            kind: RunEventKind,
        ) -> Result<Option<RunEvent>> {
            Ok(self
                .run_events
                .borrow()
                .iter()
                .filter(|event| event.run_id == run_id && event.kind == kind)
                .max_by_key(|event| (event.sequence, event.id))
                .cloned())
        }
    }

    impl RunBodyRepository for MemoryRepository {
        fn upsert_run_body(&self, body: &RunBody) -> Result<()> {
            self.run_bodies.borrow_mut().insert(body.id.clone(), body.clone());
            Ok(())
        }

        fn list_run_bodies(&self, run_id: &str) -> Result<Vec<RunBody>> {
            Ok(self
                .run_bodies
                .borrow()
                .values()
                .filter(|body| body.run_id == run_id)
                .cloned()
                .collect())
        }
    }

    #[test]
    fn creates_workspace_and_request() {
        let service = DomainService::new(MemoryRepository::default());
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: " Yakumo ".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace created");
        assert_eq!(workspace.name, "Yakumo");

        let request = service
            .create_request(CreateRequest {
                id: "rq_v2".to_string(),
                node_id: "node_v2".to_string(),
                workspace_id: workspace.id,
                parent_id: None,
                protocol: Protocol::Http,
                name: " Health ".to_string(),
                description: String::new(),
                config: BTreeMap::new(),
                sort_key: "a".to_string(),
                now,
            })
            .expect("request created");
        assert_eq!(request.name, "Health");
    }

    #[test]
    fn rejects_request_without_workspace() {
        let service = DomainService::new(MemoryRepository::default());
        let err = service
            .create_request(CreateRequest {
                id: "rq_v2".to_string(),
                node_id: "node_v2".to_string(),
                workspace_id: "missing".to_string(),
                parent_id: None,
                protocol: Protocol::Http,
                name: "Health".to_string(),
                description: String::new(),
                config: BTreeMap::new(),
                sort_key: "a".to_string(),
                now: Utc::now(),
            })
            .expect_err("missing workspace rejected");
        assert!(matches!(err, Error::NotFound(_)));
    }

    #[test]
    fn rejects_request_under_non_folder_parent() {
        let service = DomainService::new(MemoryRepository::default());
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace created");
        service
            .create_request(CreateRequest {
                id: "parent_rq".to_string(),
                node_id: "parent_node".to_string(),
                workspace_id: workspace.id.clone(),
                parent_id: None,
                protocol: Protocol::Http,
                name: "Parent Request".to_string(),
                description: String::new(),
                config: BTreeMap::new(),
                sort_key: "a".to_string(),
                now,
            })
            .expect("parent request created");

        let err = service
            .create_request(CreateRequest {
                id: "child_rq".to_string(),
                node_id: "child_node".to_string(),
                workspace_id: workspace.id,
                parent_id: Some("parent_node".to_string()),
                protocol: Protocol::Http,
                name: "Child Request".to_string(),
                description: String::new(),
                config: BTreeMap::new(),
                sort_key: "b".to_string(),
                now,
            })
            .expect_err("request parent rejected");
        assert!(matches!(err, Error::InvalidInput(_)));
    }

    #[test]
    fn manages_environments() {
        let service = DomainService::new(MemoryRepository::default());
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace created");
        let mut variables = BTreeMap::new();
        variables.insert("base_url".to_string(), json!("https://example.test"));

        let environment = service
            .create_environment(CreateEnvironment {
                id: "env_v2".to_string(),
                workspace_id: workspace.id.clone(),
                name: " Local ".to_string(),
                variables,
                now,
            })
            .expect("environment created");
        assert_eq!(environment.name, "Local");

        let mut updated_variables = BTreeMap::new();
        updated_variables.insert("token".to_string(), json!("secret"));
        let updated = service
            .update_environment(UpdateEnvironment {
                id: environment.id.clone(),
                name: Some("Dev".to_string()),
                variables: Some(updated_variables),
                now,
            })
            .expect("environment updated");
        assert_eq!(updated.name, "Dev");
        assert_eq!(updated.variables.get("token"), Some(&json!("secret")));
        assert_eq!(
            service.repository().list_environments(&workspace.id).expect("environment list").len(),
            1
        );

        service.delete_environment(&environment.id).expect("environment deleted");
        assert!(
            service
                .repository()
                .get_environment(&environment.id)
                .expect("environment read")
                .is_none()
        );
    }

    #[test]
    fn duplicates_request_config_into_target_folder() {
        let service = DomainService::new(MemoryRepository::default());
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace created");
        let folder = service
            .create_folder(CreateFolder {
                id: "folder_v2".to_string(),
                workspace_id: workspace.id.clone(),
                parent_id: None,
                name: "Copies".to_string(),
                sort_key: "a".to_string(),
                now,
            })
            .expect("folder created");
        let mut config = BTreeMap::new();
        config.insert("url".to_string(), Value::String("https://example.test".to_string()));
        config.insert("method".to_string(), Value::String("POST".to_string()));
        service
            .create_request(CreateRequest {
                id: "rq_source".to_string(),
                node_id: "node_source".to_string(),
                workspace_id: workspace.id.clone(),
                parent_id: None,
                protocol: Protocol::Graphql,
                name: "GraphQL".to_string(),
                description: "source".to_string(),
                config: config.clone(),
                sort_key: "b".to_string(),
                now,
            })
            .expect("source request created");

        let duplicate = service
            .duplicate_request(DuplicateRequest {
                source_id: "rq_source".to_string(),
                id: "rq_copy".to_string(),
                node_id: "node_copy".to_string(),
                parent_id: Some(folder.id.clone()),
                name: Some("GraphQL Copy".to_string()),
                sort_key: "c".to_string(),
                now,
            })
            .expect("request duplicated");

        assert_eq!(duplicate.id, "rq_copy");
        assert_eq!(duplicate.protocol, Protocol::Graphql);
        assert_eq!(duplicate.description, "source");
        assert_eq!(duplicate.config, config);
        let node = service
            .repository()
            .get_request_node("node_copy")
            .expect("node read")
            .expect("copy node");
        assert_eq!(node.parent_id.as_deref(), Some(folder.id.as_str()));
        assert_eq!(node.request_id.as_deref(), Some("rq_copy"));
        assert_eq!(node.name, "GraphQL Copy");
        assert_eq!(node.sort_key, "c");
    }

    #[test]
    fn manages_request_tree_nodes() {
        let service = DomainService::new(MemoryRepository::default());
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace created");
        let folder = service
            .create_folder(CreateFolder {
                id: "folder_v2".to_string(),
                workspace_id: workspace.id.clone(),
                parent_id: None,
                name: " APIs ".to_string(),
                sort_key: "a".to_string(),
                now,
            })
            .expect("folder created");
        assert_eq!(folder.name, "APIs");

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
            .expect("request created");
        let updated = service
            .update_request(UpdateRequest {
                id: request.id.clone(),
                name: Some("Ping".to_string()),
                description: Some("updated".to_string()),
                config: None,
                now,
            })
            .expect("request updated");
        assert_eq!(updated.name, "Ping");

        let moved = service
            .move_request_node(MoveRequestNode {
                id: "node_v2".to_string(),
                parent_id: None,
                sort_key: "z".to_string(),
                now,
            })
            .expect("node moved");
        assert_eq!(moved.parent_id, None);
        assert_eq!(moved.sort_key, "z");

        service.delete_request_node(&moved.id).expect("node deleted");
        assert!(service.repository().get_request(&request.id).expect("request read").is_none());
    }

    #[test]
    fn updates_folder_name() {
        let service = DomainService::new(MemoryRepository::default());
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace created");
        let folder = service
            .create_folder(CreateFolder {
                id: "folder_v2".to_string(),
                workspace_id: workspace.id,
                parent_id: None,
                name: " Old Name ".to_string(),
                sort_key: "a".to_string(),
                now,
            })
            .expect("folder created");

        let updated = service
            .update_folder(UpdateFolder {
                id: folder.id.clone(),
                name: Some(" New Name ".to_string()),
                now,
            })
            .expect("folder updated");

        assert_eq!(updated.name, "New Name");
        assert_eq!(
            service
                .repository()
                .get_request_node(&folder.id)
                .expect("folder read")
                .expect("folder node")
                .name,
            "New Name"
        );
    }

    #[test]
    fn rejects_moving_folder_under_descendant() {
        let service = DomainService::new(MemoryRepository::default());
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace created");
        service
            .create_folder(CreateFolder {
                id: "parent".to_string(),
                workspace_id: workspace.id.clone(),
                parent_id: None,
                name: "Parent".to_string(),
                sort_key: "a".to_string(),
                now,
            })
            .expect("parent folder created");
        service
            .create_folder(CreateFolder {
                id: "child".to_string(),
                workspace_id: workspace.id,
                parent_id: Some("parent".to_string()),
                name: "Child".to_string(),
                sort_key: "b".to_string(),
                now,
            })
            .expect("child folder created");

        let err = service
            .move_request_node(MoveRequestNode {
                id: "parent".to_string(),
                parent_id: Some("child".to_string()),
                sort_key: "z".to_string(),
                now,
            })
            .expect_err("cycle rejected");
        assert!(matches!(err, Error::InvalidInput(_)));
    }

    #[test]
    fn manages_run_lifecycle() {
        let service = DomainService::new(MemoryRepository::default());
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace created");
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
            .expect("request created");

        let run = service
            .create_run(CreateRun { id: "run_v2".to_string(), request_id: request.id, now })
            .expect("run created");
        assert_eq!(run.state, RunState::Running);

        let event = service
            .append_run_event(AppendRunEvent {
                run_id: run.id.clone(),
                sequence: 0,
                kind: RunEventKind::ResponseHeaders,
                data: BTreeMap::new(),
                now,
            })
            .expect("event appended");
        assert_eq!(event.id, 1);

        let body = service
            .record_run_body(RecordRunBody {
                id: "body_v2".to_string(),
                run_id: run.id.clone(),
                event_id: Some(event.id),
                body_role: BodyRole::Response,
                content_type: Some("application/json".to_string()),
                byte_length: 11,
                storage_kind: BodyStorageKind::Inline,
                storage_ref: "inline:{\"ok\":true}".to_string(),
                now,
            })
            .expect("body recorded");
        assert_eq!(body.byte_length, 11);

        let run = service
            .finish_run(FinishRun {
                run_id: run.id.clone(),
                state: RunState::Completed,
                status_code: Some(200),
                error: None,
                now,
            })
            .expect("run finished");
        assert_eq!(run.state, RunState::Completed);

        let err = service
            .append_run_event(AppendRunEvent {
                run_id: run.id.clone(),
                sequence: 1,
                kind: RunEventKind::Log,
                data: BTreeMap::new(),
                now,
            })
            .expect_err("closed run rejects event append");
        assert!(matches!(err, Error::InvalidInput(_)));

        service.delete_run(&run.id).expect("run deleted");
        assert!(service.repository().get_run(&run.id).expect("run read").is_none());
    }

    #[test]
    fn prunes_runs_by_request_scope() {
        let service = DomainService::new(MemoryRepository::default());
        let now = Utc::now();
        let workspace = service
            .create_workspace(CreateWorkspace {
                id: "wk_v2".to_string(),
                name: "Yakumo".to_string(),
                description: String::new(),
                now,
            })
            .expect("workspace created");
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
            .expect("request created");

        for index in 0..3 {
            service
                .create_run(CreateRun {
                    id: format!("run_{index}"),
                    request_id: request.id.clone(),
                    now: now + chrono::TimeDelta::seconds(index),
                })
                .expect("run created");
        }

        let deleted = service
            .prune_runs(PruneRuns {
                scope: PruneRunsScope::Request { request_id: request.id.clone() },
                keep_last: 1,
            })
            .expect("runs pruned");
        assert_eq!(deleted, 2);

        let remaining =
            service.repository().list_runs_for_request(&request.id, Page::first(10)).expect("runs");
        assert_eq!(remaining.len(), 1);
    }
}
