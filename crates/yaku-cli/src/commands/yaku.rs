use crate::cli::{
    YakuBackupCommands, YakuCommands, YakuEnvironmentCommands, YakuFolderCommands,
    YakuRequestCommands, YakuRunCommands, YakuWorkspaceCommands,
};
use crate::utils::output::print_json;
use chrono::Utc;
use rand::distributions::Alphanumeric;
use rand::{Rng, thread_rng};
use serde::Serialize;
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet};
use std::io::Write;
use std::path::{Path, PathBuf};
use yaku_domain::{
    BodyStorageKind, CreateEnvironment, CreateFolder, CreateRequest, CreateWorkspace,
    DomainService, DuplicateRequest, MoveRequestNode, Page, Protocol, PruneRuns, PruneRunsScope,
    RequestNodeKind, RunEventKind, Setting, UpdateEnvironment, UpdateFolder, UpdateRequest,
};
use yaku_engine::{
    GrpcEngine, Header, HttpEngine, QueryParam, ReflectionGrpcSender, ReqwestHttpSender,
    ReqwestSseSender, SendGrpc, SendHttp, SendSse, SendWebSocket, SseEngine, ThresholdBodyStore,
    TungsteniteWebSocketSender, WebSocketEngine, render_config,
};
use yaku_store::{BackupManifest, Store, WorkspaceBackup};

pub fn run(data_dir: PathBuf, command: YakuCommands, environment_id: Option<String>) -> i32 {
    match run_inner(data_dir, command, environment_id) {
        Ok(()) => 0,
        Err(error) => {
            eprintln!("Error: {error}");
            1
        }
    }
}

fn run_inner(
    data_dir: PathBuf,
    command: YakuCommands,
    environment_id: Option<String>,
) -> Result<(), String> {
    let bodies_dir = data_dir.join("yaku-bodies");
    let store = open_store(data_dir)?;
    let service = DomainService::new(store);

    match command {
        YakuCommands::Workspace(args) => match args.command {
            YakuWorkspaceCommands::List { cursor, limit } => {
                let workspaces = service
                    .repository()
                    .list_workspace_page(Page { cursor, limit })
                    .map_err(|e| e.to_string())?;
                print_json(&page_response(workspaces), "Yaku workspace list")
            }
            YakuWorkspaceCommands::Create { name, description } => {
                let workspace = service
                    .create_workspace(CreateWorkspace {
                        id: prefixed_id("wk"),
                        name,
                        description,
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&workspace, "Yaku workspace create")
            }
            YakuWorkspaceCommands::Get { workspace_id } => {
                let workspace = service
                    .repository()
                    .get_workspace(&workspace_id)
                    .map_err(|e| e.to_string())?
                    .ok_or_else(|| format!("Workspace '{workspace_id}' not found"))?;
                print_json(&workspace, "Yaku workspace get")
            }
            YakuWorkspaceCommands::Delete { workspace_id } => {
                service.delete_workspace(&workspace_id).map_err(|e| e.to_string())?;
                let body_gc = gc_body_files(service.repository(), &bodies_dir, false)?;
                print_json(
                    &json!({ "deleted": true, "workspaceId": workspace_id, "bodyGc": body_gc }),
                    "Yaku workspace delete",
                )
            }
        },
        YakuCommands::Environment(args) => match args.command {
            YakuEnvironmentCommands::List { workspace_id } => {
                let environments = service
                    .repository()
                    .list_environments(&workspace_id)
                    .map_err(|e| e.to_string())?;
                print_json(&environments, "Yaku environment list")
            }
            YakuEnvironmentCommands::Get { environment_id } => {
                let environment = service
                    .repository()
                    .get_environment(&environment_id)
                    .map_err(|e| e.to_string())?
                    .ok_or_else(|| format!("Environment '{environment_id}' not found"))?;
                print_json(&environment, "Yaku environment get")
            }
            YakuEnvironmentCommands::Create { workspace_id, name, variables_json } => {
                let environment = service
                    .create_environment(CreateEnvironment {
                        id: prefixed_id("env"),
                        workspace_id,
                        name,
                        variables: parse_variables_json(variables_json)?,
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&environment, "Yaku environment create")
            }
            YakuEnvironmentCommands::Update { environment_id, name, variables_json } => {
                let environment = service
                    .update_environment(UpdateEnvironment {
                        id: environment_id,
                        name,
                        variables: variables_json.map(parse_variables_json).transpose()?,
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&environment, "Yaku environment update")
            }
            YakuEnvironmentCommands::Delete { environment_id } => {
                service.delete_environment(&environment_id).map_err(|e| e.to_string())?;
                print_json(
                    &json!({ "deleted": true, "environmentId": environment_id }),
                    "Yaku environment delete",
                )
            }
        },
        YakuCommands::Folder(args) => match args.command {
            YakuFolderCommands::List { workspace_id, cursor, limit } => {
                let target_len = limit.max(1) as usize;
                let scan_limit = limit.clamp(100, 1_000);
                let mut scan_cursor = cursor;
                let mut folders = Vec::new();
                let mut next_cursor = None;

                while folders.len() < target_len {
                    let page = service
                        .repository()
                        .list_request_node_page(
                            &workspace_id,
                            Page { cursor: scan_cursor, limit: scan_limit },
                        )
                        .map_err(|e| e.to_string())?;

                    if page.is_empty() {
                        break;
                    }

                    for item in &page {
                        scan_cursor = Some(item.cursor);
                        if item.node.kind == RequestNodeKind::Folder {
                            folders.push(item.clone());
                            if folders.len() == target_len {
                                next_cursor = scan_cursor;
                                break;
                            }
                        }
                    }

                    if folders.len() == target_len || page.len() < scan_limit as usize {
                        break;
                    }
                }

                print_json(
                    &json!({ "items": folders, "nextCursor": next_cursor }),
                    "Yaku folder list",
                )
            }
            YakuFolderCommands::Get { folder_id } => {
                let node = service
                    .repository()
                    .get_request_node(&folder_id)
                    .map_err(|e| e.to_string())?
                    .ok_or_else(|| format!("Folder '{folder_id}' not found"))?;
                if node.kind != RequestNodeKind::Folder {
                    return Err(format!("Request node '{folder_id}' is not a folder"));
                }
                print_json(&node, "Yaku folder get")
            }
            YakuFolderCommands::Create { workspace_id, name, parent_id, sort_key } => {
                let node = service
                    .create_folder(CreateFolder {
                        id: prefixed_id("folder"),
                        workspace_id,
                        parent_id,
                        name,
                        sort_key: sort_key.unwrap_or_else(default_sort_key),
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&node, "Yaku folder create")
            }
            YakuFolderCommands::Update { folder_id, name } => {
                let node = service
                    .update_folder(UpdateFolder {
                        id: folder_id,
                        name: Some(name),
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&node, "Yaku folder update")
            }
            YakuFolderCommands::Move { folder_id, parent_id, sort_key } => {
                let current = service
                    .repository()
                    .get_request_node(&folder_id)
                    .map_err(|e| e.to_string())?
                    .ok_or_else(|| format!("Folder '{folder_id}' not found"))?;
                if current.kind != RequestNodeKind::Folder {
                    return Err(format!("Request node '{folder_id}' is not a folder"));
                }
                let node = service
                    .move_request_node(MoveRequestNode {
                        id: folder_id,
                        parent_id,
                        sort_key: sort_key.unwrap_or_else(default_sort_key),
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&node, "Yaku folder move")
            }
            YakuFolderCommands::Delete { folder_id } => {
                let node = service
                    .repository()
                    .get_request_node(&folder_id)
                    .map_err(|e| e.to_string())?
                    .ok_or_else(|| format!("Folder '{folder_id}' not found"))?;
                if node.kind != RequestNodeKind::Folder {
                    return Err(format!("Request node '{folder_id}' is not a folder"));
                }
                service.delete_request_node(&folder_id).map_err(|e| e.to_string())?;
                let body_gc = gc_body_files(service.repository(), &bodies_dir, false)?;
                print_json(
                    &json!({ "deleted": true, "folderId": folder_id, "bodyGc": body_gc }),
                    "Yaku folder delete",
                )
            }
        },
        YakuCommands::Request(args) => match args.command {
            YakuRequestCommands::List { workspace_id, cursor, limit } => {
                let tree = service
                    .repository()
                    .list_request_node_page(&workspace_id, Page { cursor, limit })
                    .map_err(|e| e.to_string())?;
                print_json(&page_response(tree), "Yaku request list")
            }
            YakuRequestCommands::Get { request_id } => {
                let request = service
                    .repository()
                    .get_request(&request_id)
                    .map_err(|e| e.to_string())?
                    .ok_or_else(|| format!("Request '{request_id}' not found"))?;
                print_json(&request, "Yaku request get")
            }
            YakuRequestCommands::GetNode { node_id } => {
                let node = service
                    .repository()
                    .get_request_node(&node_id)
                    .map_err(|e| e.to_string())?
                    .ok_or_else(|| format!("Request node '{node_id}' not found"))?;
                let request = match &node.request_id {
                    Some(request_id) => {
                        service.repository().get_request(request_id).map_err(|e| e.to_string())?
                    }
                    None => None,
                };
                print_json(&json!({ "node": node, "request": request }), "Yaku request get-node")
            }
            YakuRequestCommands::Duplicate { request_id, name, parent_id, sort_key } => {
                let request = service
                    .duplicate_request(DuplicateRequest {
                        source_id: request_id,
                        id: prefixed_id("rq"),
                        node_id: prefixed_id("node"),
                        parent_id,
                        name,
                        sort_key: sort_key.unwrap_or_else(default_sort_key),
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&request, "Yaku request duplicate")
            }
            YakuRequestCommands::Create {
                workspace_id,
                name,
                method,
                url,
                headers,
                query,
                body,
                timeout_ms,
                no_follow_redirects,
                parent_id,
                sort_key,
            } => {
                let headers = parse_headers(headers)?;
                let query = parse_query(query)?;
                let mut config = BTreeMap::new();
                config.insert("method".to_string(), json!(method));
                config.insert("url".to_string(), json!(url));
                config.insert("headers".to_string(), json!(headers));
                config.insert("query".to_string(), json!(query));
                config.insert("followRedirects".to_string(), json!(!no_follow_redirects));
                config.insert("timeoutMs".to_string(), json!(timeout_ms));
                if let Some(body) = body {
                    config.insert("body".to_string(), json!(body));
                }
                let request = service
                    .create_request(CreateRequest {
                        id: prefixed_id("rq"),
                        node_id: prefixed_id("node"),
                        workspace_id,
                        parent_id,
                        protocol: Protocol::Http,
                        name,
                        description: String::new(),
                        config,
                        sort_key: sort_key.unwrap_or_else(default_sort_key),
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&request, "Yaku request create")
            }
            YakuRequestCommands::PatchHttp {
                request_id,
                name,
                method,
                url,
                headers,
                query,
                body,
                clear_body,
                timeout_ms,
                follow_redirects,
                no_follow_redirects,
            } => {
                let current = service
                    .repository()
                    .get_request(&request_id)
                    .map_err(|e| e.to_string())?
                    .ok_or_else(|| format!("Request '{request_id}' not found"))?;
                if current.protocol != Protocol::Http {
                    return Err(format!("Request '{request_id}' is not an HTTP request"));
                }

                let mut config = current.config;
                if let Some(method) = method {
                    config.insert("method".to_string(), json!(method));
                }
                if let Some(url) = url {
                    config.insert("url".to_string(), json!(url));
                }
                if !headers.is_empty() {
                    config.insert("headers".to_string(), json!(parse_headers(headers)?));
                }
                if !query.is_empty() {
                    config.insert("query".to_string(), json!(parse_query(query)?));
                }
                if let Some(body) = body {
                    config.insert("body".to_string(), json!(body));
                }
                if clear_body {
                    config.remove("body");
                }
                if let Some(timeout_ms) = timeout_ms {
                    config.insert("timeoutMs".to_string(), json!(timeout_ms));
                }
                if follow_redirects || no_follow_redirects {
                    config.insert("followRedirects".to_string(), json!(follow_redirects));
                }

                let request = service
                    .update_request(UpdateRequest {
                        id: request_id,
                        name,
                        description: None,
                        config: Some(config),
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&request, "Yaku request patch-http")
            }
            YakuRequestCommands::PatchGraphql {
                request_id,
                name,
                url,
                query,
                variables,
                clear_variables,
                operation_name,
                clear_operation_name,
                headers,
                timeout_ms,
                follow_redirects,
                no_follow_redirects,
            } => {
                let current = service
                    .repository()
                    .get_request(&request_id)
                    .map_err(|e| e.to_string())?
                    .ok_or_else(|| format!("Request '{request_id}' not found"))?;
                if current.protocol != Protocol::Graphql {
                    return Err(format!("Request '{request_id}' is not a GraphQL request"));
                }

                let mut config = current.config;
                if let Some(url) = url {
                    config.insert("url".to_string(), json!(url));
                }
                if !headers.is_empty() {
                    let mut headers = parse_headers(headers)?;
                    ensure_header(&mut headers, "Content-Type", "application/json");
                    config.insert("headers".to_string(), json!(headers));
                }
                if let Some(timeout_ms) = timeout_ms {
                    config.insert("timeoutMs".to_string(), json!(timeout_ms));
                }
                if follow_redirects || no_follow_redirects {
                    config.insert("followRedirects".to_string(), json!(follow_redirects));
                }

                let (query, variables, operation_name) = patched_graphql_parts(
                    &config,
                    query,
                    variables,
                    clear_variables,
                    operation_name,
                    clear_operation_name,
                )?;
                let body = graphql_body(query, Some(variables.to_string()), operation_name)?;
                config.insert("method".to_string(), json!("POST"));
                config.insert("query".to_string(), json!(Vec::<QueryParam>::new()));
                config.insert("body".to_string(), json!(body));

                let request = service
                    .update_request(UpdateRequest {
                        id: request_id,
                        name,
                        description: None,
                        config: Some(config),
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&request, "Yaku request patch-graphql")
            }
            YakuRequestCommands::PatchSse {
                request_id,
                name,
                url,
                headers,
                query,
                timeout_ms,
                follow_redirects,
                no_follow_redirects,
            } => {
                let current = service
                    .repository()
                    .get_request(&request_id)
                    .map_err(|e| e.to_string())?
                    .ok_or_else(|| format!("Request '{request_id}' not found"))?;
                if current.protocol != Protocol::Sse {
                    return Err(format!("Request '{request_id}' is not an SSE request"));
                }

                let mut config = current.config;
                if let Some(url) = url {
                    config.insert("url".to_string(), json!(url));
                }
                if !headers.is_empty() {
                    let mut headers = parse_headers(headers)?;
                    ensure_header(&mut headers, "Accept", "text/event-stream");
                    config.insert("headers".to_string(), json!(headers));
                }
                if !query.is_empty() {
                    config.insert("query".to_string(), json!(parse_query(query)?));
                }
                if let Some(timeout_ms) = timeout_ms {
                    config.insert("timeoutMs".to_string(), json!(timeout_ms));
                }
                if follow_redirects || no_follow_redirects {
                    config.insert("followRedirects".to_string(), json!(follow_redirects));
                }

                let request = service
                    .update_request(UpdateRequest {
                        id: request_id,
                        name,
                        description: None,
                        config: Some(config),
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&request, "Yaku request patch-sse")
            }
            YakuRequestCommands::CreateFolder { workspace_id, name, parent_id, sort_key } => {
                let node = service
                    .create_folder(CreateFolder {
                        id: prefixed_id("folder"),
                        workspace_id,
                        parent_id,
                        name,
                        sort_key: sort_key.unwrap_or_else(default_sort_key),
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&node, "Yaku request create-folder")
            }
            YakuRequestCommands::Update { request_id, name, description, config_json } => {
                let config = config_json.map(parse_config_json).transpose()?;
                let request = service
                    .update_request(UpdateRequest {
                        id: request_id,
                        name,
                        description,
                        config,
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&request, "Yaku request update")
            }
            YakuRequestCommands::Move { node_id, parent_id, sort_key } => {
                let node = service
                    .move_request_node(MoveRequestNode {
                        id: node_id,
                        parent_id,
                        sort_key: sort_key.unwrap_or_else(default_sort_key),
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&node, "Yaku request move")
            }
            YakuRequestCommands::Delete { node_id } => {
                service.delete_request_node(&node_id).map_err(|e| e.to_string())?;
                let body_gc = gc_body_files(service.repository(), &bodies_dir, false)?;
                print_json(
                    &json!({ "deleted": true, "nodeId": node_id, "bodyGc": body_gc }),
                    "Yaku request delete",
                )
            }
            YakuRequestCommands::CreateGraphql {
                workspace_id,
                name,
                url,
                query,
                variables,
                operation_name,
                headers,
                timeout_ms,
                no_follow_redirects,
                parent_id,
                sort_key,
            } => {
                let mut headers = parse_headers(headers)?;
                ensure_header(&mut headers, "Content-Type", "application/json");
                let body = graphql_body(query, variables, operation_name)?;
                let mut config = BTreeMap::new();
                config.insert("method".to_string(), json!("POST"));
                config.insert("url".to_string(), json!(url));
                config.insert("headers".to_string(), json!(headers));
                config.insert("query".to_string(), json!(Vec::<QueryParam>::new()));
                config.insert("body".to_string(), json!(body));
                config.insert("followRedirects".to_string(), json!(!no_follow_redirects));
                config.insert("timeoutMs".to_string(), json!(timeout_ms));
                let request = service
                    .create_request(CreateRequest {
                        id: prefixed_id("rq"),
                        node_id: prefixed_id("node"),
                        workspace_id,
                        parent_id,
                        protocol: Protocol::Graphql,
                        name,
                        description: String::new(),
                        config,
                        sort_key: sort_key.unwrap_or_else(default_sort_key),
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&request, "Yaku request create-graphql")
            }
            YakuRequestCommands::CreateSse {
                workspace_id,
                name,
                url,
                headers,
                query,
                timeout_ms,
                no_follow_redirects,
                parent_id,
                sort_key,
            } => {
                let mut headers = parse_headers(headers)?;
                ensure_header(&mut headers, "Accept", "text/event-stream");
                let query = parse_query(query)?;
                let mut config = BTreeMap::new();
                config.insert("url".to_string(), json!(url));
                config.insert("headers".to_string(), json!(headers));
                config.insert("query".to_string(), json!(query));
                config.insert("followRedirects".to_string(), json!(!no_follow_redirects));
                config.insert("timeoutMs".to_string(), json!(timeout_ms));
                let request = service
                    .create_request(CreateRequest {
                        id: prefixed_id("rq"),
                        node_id: prefixed_id("node"),
                        workspace_id,
                        parent_id,
                        protocol: Protocol::Sse,
                        name,
                        description: String::new(),
                        config,
                        sort_key: sort_key.unwrap_or_else(default_sort_key),
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&request, "Yaku request create-sse")
            }
            YakuRequestCommands::CreateWebsocket {
                workspace_id,
                name,
                url,
                headers,
                query,
                messages,
                max_messages,
                timeout_ms,
                parent_id,
                sort_key,
            } => {
                let headers = parse_headers(headers)?;
                let query = parse_query(query)?;
                let mut config = BTreeMap::new();
                config.insert("url".to_string(), json!(url));
                config.insert("headers".to_string(), json!(headers));
                config.insert("query".to_string(), json!(query));
                config.insert("messages".to_string(), json!(messages));
                config.insert("maxMessages".to_string(), json!(max_messages));
                config.insert("timeoutMs".to_string(), json!(timeout_ms));
                let request = service
                    .create_request(CreateRequest {
                        id: prefixed_id("rq"),
                        node_id: prefixed_id("node"),
                        workspace_id,
                        parent_id,
                        protocol: Protocol::WebSocket,
                        name,
                        description: String::new(),
                        config,
                        sort_key: sort_key.unwrap_or_else(default_sort_key),
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&request, "Yaku request create-websocket")
            }
            YakuRequestCommands::PatchWebsocket {
                request_id,
                name,
                url,
                headers,
                query,
                messages,
                clear_messages,
                max_messages,
                timeout_ms,
            } => {
                let current = service
                    .repository()
                    .get_request(&request_id)
                    .map_err(|e| e.to_string())?
                    .ok_or_else(|| format!("Request '{request_id}' not found"))?;
                if current.protocol != Protocol::WebSocket {
                    return Err(format!("Request '{request_id}' is not a WebSocket request"));
                }

                let mut config = current.config;
                if let Some(url) = url {
                    config.insert("url".to_string(), json!(url));
                }
                if !headers.is_empty() {
                    config.insert("headers".to_string(), json!(parse_headers(headers)?));
                }
                if !query.is_empty() {
                    config.insert("query".to_string(), json!(parse_query(query)?));
                }
                if !messages.is_empty() {
                    config.insert("messages".to_string(), json!(messages));
                }
                if clear_messages {
                    config.insert("messages".to_string(), json!(Vec::<String>::new()));
                }
                if let Some(max_messages) = max_messages {
                    config.insert("maxMessages".to_string(), json!(max_messages));
                }
                if let Some(timeout_ms) = timeout_ms {
                    config.insert("timeoutMs".to_string(), json!(timeout_ms));
                }

                let request = service
                    .update_request(UpdateRequest {
                        id: request_id,
                        name,
                        description: None,
                        config: Some(config),
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&request, "Yaku request patch-websocket")
            }
            YakuRequestCommands::CreateGrpc {
                workspace_id,
                name,
                url,
                service: grpc_service,
                method,
                metadata,
                message,
                proto_files,
                proto_import_roots,
                no_reflection,
                timeout_ms,
                parent_id,
                sort_key,
            } => {
                let metadata = parse_headers(metadata)?;
                let mut config = BTreeMap::new();
                config.insert("url".to_string(), json!(url));
                config.insert("service".to_string(), json!(grpc_service));
                config.insert("method".to_string(), json!(method));
                config.insert("metadata".to_string(), json!(metadata));
                config.insert("message".to_string(), json!(message));
                config.insert("protoImportRoots".to_string(), json!(proto_import_roots));
                config.insert("protoFiles".to_string(), json!(proto_files));
                config.insert("useReflection".to_string(), json!(!no_reflection));
                config.insert("timeoutMs".to_string(), json!(timeout_ms));
                let request = service
                    .create_request(CreateRequest {
                        id: prefixed_id("rq"),
                        node_id: prefixed_id("node"),
                        workspace_id,
                        parent_id,
                        protocol: Protocol::Grpc,
                        name,
                        description: String::new(),
                        config,
                        sort_key: sort_key.unwrap_or_else(default_sort_key),
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&request, "Yaku request create-grpc")
            }
            YakuRequestCommands::PatchGrpc {
                request_id,
                name,
                url,
                service: grpc_service,
                method,
                metadata,
                message,
                clear_message,
                proto_files,
                clear_proto_files,
                proto_import_roots,
                clear_proto_import_roots,
                reflection,
                no_reflection,
                timeout_ms,
            } => {
                let current = service
                    .repository()
                    .get_request(&request_id)
                    .map_err(|e| e.to_string())?
                    .ok_or_else(|| format!("Request '{request_id}' not found"))?;
                if current.protocol != Protocol::Grpc {
                    return Err(format!("Request '{request_id}' is not a gRPC request"));
                }

                let mut config = current.config;
                if let Some(url) = url {
                    config.insert("url".to_string(), json!(url));
                }
                if let Some(grpc_service) = grpc_service {
                    config.insert("service".to_string(), json!(grpc_service));
                }
                if let Some(method) = method {
                    config.insert("method".to_string(), json!(method));
                }
                if !metadata.is_empty() {
                    config.insert("metadata".to_string(), json!(parse_headers(metadata)?));
                }
                if let Some(message) = message {
                    config.insert("message".to_string(), json!(message));
                }
                if clear_message {
                    config.insert("message".to_string(), Value::Null);
                }
                if !proto_import_roots.is_empty() {
                    config.insert("protoImportRoots".to_string(), json!(proto_import_roots));
                }
                if clear_proto_import_roots {
                    config.insert("protoImportRoots".to_string(), json!(Vec::<String>::new()));
                }
                if !proto_files.is_empty() {
                    config.insert("protoFiles".to_string(), json!(proto_files));
                }
                if clear_proto_files {
                    config.insert("protoFiles".to_string(), json!(Vec::<String>::new()));
                }
                if reflection || no_reflection {
                    config.insert("useReflection".to_string(), json!(reflection));
                }
                if let Some(timeout_ms) = timeout_ms {
                    config.insert("timeoutMs".to_string(), json!(timeout_ms));
                }

                let request = service
                    .update_request(UpdateRequest {
                        id: request_id,
                        name,
                        description: None,
                        config: Some(config),
                        now: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(&request, "Yaku request patch-grpc")
            }
        },
        YakuCommands::Run(args) => match args.command {
            YakuRunCommands::Get { run_id } => {
                let run = service
                    .repository()
                    .get_run(&run_id)
                    .map_err(|e| e.to_string())?
                    .ok_or_else(|| format!("Run '{run_id}' not found"))?;
                print_json(&run, "Yaku run get")
            }
            YakuRunCommands::List { request_id, cursor, limit } => {
                let runs = service
                    .repository()
                    .list_run_page_for_request(&request_id, Page { cursor, limit })
                    .map_err(|e| e.to_string())?;
                print_json(&page_response(runs), "Yaku run list")
            }
            YakuRunCommands::ListWorkspace { workspace_id, cursor, limit } => {
                let runs = service
                    .repository()
                    .list_run_page_for_workspace(&workspace_id, Page { cursor, limit })
                    .map_err(|e| e.to_string())?;
                print_json(&page_response(runs), "Yaku run list-workspace")
            }
            YakuRunCommands::Events { run_id, cursor, kind, limit } => {
                let events = match kind {
                    Some(kind) => service
                        .repository()
                        .list_run_events_by_kind(
                            &run_id,
                            parse_run_event_kind(&kind)?,
                            Page { cursor, limit },
                        )
                        .map_err(|e| e.to_string())?,
                    None => service
                        .repository()
                        .list_run_events(&run_id, Page { cursor, limit })
                        .map_err(|e| e.to_string())?,
                };
                let next_cursor = events.last().map(|event| event.id);
                print_json(
                    &json!({ "items": events, "nextCursor": next_cursor }),
                    "Yaku run events",
                )
            }
            YakuRunCommands::Snapshot { run_id } => {
                let snapshot = service
                    .repository()
                    .latest_run_event_by_kind(&run_id, RunEventKind::RequestSnapshot)
                    .map_err(|e| e.to_string())?
                    .ok_or_else(|| format!("Run '{run_id}' does not have a request snapshot"))?;
                print_json(&snapshot, "Yaku run snapshot")
            }
            YakuRunCommands::Bodies { run_id } => {
                let bodies =
                    service.repository().list_run_bodies(&run_id).map_err(|e| e.to_string())?;
                print_json(&bodies, "Yaku run bodies")
            }
            YakuRunCommands::Body { body_id } => {
                let body = service
                    .repository()
                    .get_run_body(&body_id)
                    .map_err(|e| e.to_string())?
                    .ok_or_else(|| format!("Run body '{body_id}' not found"))?;
                let bytes = read_body_bytes(&body.storage_kind, &body.storage_ref)?;
                std::io::stdout()
                    .write_all(&bytes)
                    .map_err(|e| format!("Failed to write body to stdout: {e}"))
            }
            YakuRunCommands::Delete { run_id } => {
                service.delete_run(&run_id).map_err(|e| e.to_string())?;
                let body_gc = gc_body_files(service.repository(), &bodies_dir, false)?;
                print_json(
                    &json!({ "deleted": true, "runId": run_id, "bodyGc": body_gc }),
                    "Yaku run delete",
                )
            }
            YakuRunCommands::Prune { request_id, workspace_id, keep_last } => {
                let scope = match (request_id, workspace_id) {
                    (Some(request_id), None) => PruneRunsScope::Request { request_id },
                    (None, Some(workspace_id)) => PruneRunsScope::Workspace { workspace_id },
                    _ => {
                        return Err(
                            "Specify exactly one of --request-id or --workspace-id".to_string()
                        );
                    }
                };
                let deleted = service
                    .prune_runs(PruneRuns { scope, keep_last })
                    .map_err(|e| e.to_string())?;
                let body_gc = gc_body_files(service.repository(), &bodies_dir, false)?;
                print_json(
                    &json!({ "deleted": deleted, "keepLast": keep_last, "bodyGc": body_gc }),
                    "Yaku run prune",
                )
            }
            YakuRunCommands::RetentionGet { workspace_id } => {
                let keep_last = workspace_run_retention(service.repository(), &workspace_id)?;
                print_json(
                    &json!({ "workspaceId": workspace_id, "keepLast": keep_last }),
                    "Yaku run retention-get",
                )
            }
            YakuRunCommands::RetentionSet { workspace_id, keep_last } => {
                if service
                    .repository()
                    .get_workspace(&workspace_id)
                    .map_err(|e| e.to_string())?
                    .is_none()
                {
                    return Err(format!("Workspace '{workspace_id}' not found"));
                }
                service
                    .repository()
                    .upsert_setting(&Setting {
                        key: workspace_run_retention_key(&workspace_id),
                        value: json!(keep_last),
                        updated_at: Utc::now(),
                    })
                    .map_err(|e| e.to_string())?;
                print_json(
                    &json!({ "workspaceId": workspace_id, "keepLast": keep_last }),
                    "Yaku run retention-set",
                )
            }
            YakuRunCommands::RetentionClear { workspace_id } => {
                service
                    .repository()
                    .delete_setting(&workspace_run_retention_key(&workspace_id))
                    .map_err(|e| e.to_string())?;
                print_json(
                    &json!({ "workspaceId": workspace_id, "keepLast": null }),
                    "Yaku run retention-clear",
                )
            }
            YakuRunCommands::GcBodies { dry_run } => {
                let report = gc_body_files(service.repository(), &bodies_dir, dry_run)?;
                print_json(&report, "Yaku run gc-bodies")
            }
        },
        YakuCommands::Backup(args) => match args.command {
            YakuBackupCommands::ExportWorkspace { workspace_id, output } => {
                let export = export_workspace(service.repository(), &workspace_id)?;
                let json = serde_json::to_string_pretty(&export)
                    .map_err(|e| format!("Failed to serialize workspace export: {e}"))?;
                match output {
                    Some(output) => {
                        if let Some(parent) = output.parent() {
                            std::fs::create_dir_all(parent).map_err(|e| {
                                format!("Failed to create output dir {}: {e}", parent.display())
                            })?;
                        }
                        std::fs::write(&output, format!("{json}\n")).map_err(|e| {
                            format!("Failed to write workspace export {}: {e}", output.display())
                        })?;
                        let manifest = record_backup_manifest(
                            service.repository(),
                            Some(export.workspace.id.clone()),
                            &export.content_hash,
                            backup_manifest_metadata([
                                ("action", json!("export_workspace")),
                                ("workspaceId", json!(export.workspace.id)),
                                ("formatVersion", json!(export.format_version)),
                                ("outputKind", json!("file")),
                                ("outputPath", json!(output.display().to_string())),
                            ]),
                        )?;
                        print_json(
                            &json!({
                                "workspaceId": workspace_id,
                                "contentHash": export.content_hash,
                                "output": output.display().to_string(),
                                "bytes": json.len() + 1,
                                "manifestId": manifest.id,
                            }),
                            "Yaku backup export-workspace",
                        )
                    }
                    None => {
                        record_backup_manifest(
                            service.repository(),
                            Some(export.workspace.id.clone()),
                            &export.content_hash,
                            backup_manifest_metadata([
                                ("action", json!("export_workspace")),
                                ("workspaceId", json!(export.workspace.id)),
                                ("formatVersion", json!(export.format_version)),
                                ("outputKind", json!("stdout")),
                            ]),
                        )?;
                        println!("{json}");
                        Ok(())
                    }
                }
            }
            YakuBackupCommands::ImportWorkspace { file, replace_existing } => {
                let backup = read_workspace_backup(&file)?;
                let replaced_existing = service
                    .repository()
                    .import_workspace_backup(&backup, replace_existing)
                    .map_err(|e| e.to_string())?;
                let manifest = record_backup_manifest(
                    service.repository(),
                    Some(backup.workspace.id.clone()),
                    &backup.content_hash,
                    backup_manifest_metadata([
                        ("action", json!("import_workspace")),
                        ("workspaceId", json!(backup.workspace.id)),
                        ("formatVersion", json!(backup.format_version)),
                        ("inputPath", json!(file.display().to_string())),
                        ("replaceExistingRequested", json!(replace_existing)),
                        ("replacedExisting", json!(replaced_existing)),
                    ]),
                )?;
                let body_gc = if replaced_existing {
                    Some(gc_body_files(service.repository(), &bodies_dir, false)?)
                } else {
                    None
                };
                print_json(
                    &json!({
                        "workspaceId": backup.workspace.id,
                        "input": file.display().to_string(),
                        "contentHash": backup.content_hash,
                        "verified": true,
                        "replacedExisting": replaced_existing,
                        "environments": backup.environments.len(),
                        "requestNodes": backup.request_tree.len(),
                        "requests": backup.requests.len(),
                        "runRetention": backup.run_retention,
                        "manifestId": manifest.id,
                        "bodyGc": body_gc,
                    }),
                    "Yaku backup import-workspace",
                )
            }
            YakuBackupCommands::VerifyWorkspace { file } => {
                let backup = read_workspace_backup(&file)?;
                service.repository().verify_workspace_backup(&backup).map_err(|e| e.to_string())?;
                let manifest = record_backup_manifest(
                    service.repository(),
                    Some(backup.workspace.id.clone()),
                    &backup.content_hash,
                    backup_manifest_metadata([
                        ("action", json!("verify_workspace")),
                        ("workspaceId", json!(backup.workspace.id)),
                        ("formatVersion", json!(backup.format_version)),
                        ("inputPath", json!(file.display().to_string())),
                    ]),
                )?;
                print_json(
                    &json!({
                        "workspaceId": backup.workspace.id,
                        "input": file.display().to_string(),
                        "contentHash": backup.content_hash,
                        "verified": true,
                        "environments": backup.environments.len(),
                        "requestNodes": backup.request_tree.len(),
                        "requests": backup.requests.len(),
                        "runRetention": backup.run_retention,
                        "manifestId": manifest.id,
                    }),
                    "Yaku backup verify-workspace",
                )
            }
            YakuBackupCommands::ListManifests { workspace_id, content_hash, cursor, limit } => {
                let manifests = service
                    .repository()
                    .list_backup_manifest_page(
                        workspace_id.as_deref(),
                        content_hash.as_deref(),
                        Page { cursor, limit },
                    )
                    .map_err(|e| e.to_string())?;
                print_json(&page_response(manifests), "Yaku backup list-manifests")
            }
            YakuBackupCommands::GetManifest { manifest_id } => {
                let manifest = service
                    .repository()
                    .get_backup_manifest(&manifest_id)
                    .map_err(|e| e.to_string())?
                    .ok_or_else(|| format!("Backup manifest '{manifest_id}' not found"))?;
                print_json(&manifest, "Yaku backup get-manifest")
            }
        },
        YakuCommands::Send { request_id } => {
            let request = service
                .repository()
                .get_request(&request_id)
                .map_err(|e| e.to_string())?
                .ok_or_else(|| format!("Request '{request_id}' not found"))?;
            let config_override = match environment_id.as_deref() {
                Some(environment_id) => Some(
                    render_config(
                        request.config.clone(),
                        &load_environment_variables(service.repository(), environment_id)?,
                    )
                    .map_err(|e| e.to_string())?,
                ),
                None => None,
            };
            let workspace_id = request.workspace_id.clone();
            let run_id = prefixed_id("run");
            let run = match request.protocol.clone() {
                Protocol::Http | Protocol::Graphql => {
                    let engine = HttpEngine::with_body_store(
                        ReqwestHttpSender::new().map_err(|e| e.to_string())?,
                        ThresholdBodyStore::new(bodies_dir.clone(), 64 * 1024),
                    );
                    engine
                        .send(&service, SendHttp { run_id, request_id, config_override })
                        .map_err(|e| e.to_string())?
                }
                Protocol::Sse => {
                    let engine =
                        SseEngine::new(ReqwestSseSender::new().map_err(|e| e.to_string())?);
                    engine
                        .send(&service, SendSse { run_id, request_id, config_override })
                        .map_err(|e| e.to_string())?
                }
                Protocol::WebSocket => {
                    let engine = WebSocketEngine::new(
                        TungsteniteWebSocketSender::new().map_err(|e| e.to_string())?,
                    );
                    engine
                        .send(&service, SendWebSocket { run_id, request_id, config_override })
                        .map_err(|e| e.to_string())?
                }
                Protocol::Grpc => {
                    let engine =
                        GrpcEngine::new(ReflectionGrpcSender::new().map_err(|e| e.to_string())?);
                    engine
                        .send(&service, SendGrpc { run_id, request_id, config_override })
                        .map_err(|e| e.to_string())?
                }
            };
            auto_prune_workspace_runs(&service, &bodies_dir, &workspace_id)?;
            print_json(&run, "Yaku send")
        }
    }
}

fn export_workspace(store: &Store, workspace_id: &str) -> Result<WorkspaceBackup, String> {
    store.export_workspace_backup(workspace_id).map_err(|e| e.to_string())
}

fn read_workspace_backup(path: &Path) -> Result<WorkspaceBackup, String> {
    let bytes = std::fs::read(path)
        .map_err(|e| format!("Failed to read workspace backup {}: {e}", path.display()))?;
    serde_json::from_slice(&bytes)
        .map_err(|e| format!("Failed to parse workspace backup {}: {e}", path.display()))
}

fn record_backup_manifest(
    store: &Store,
    workspace_id: Option<String>,
    content_hash: &str,
    metadata: BTreeMap<String, Value>,
) -> Result<BackupManifest, String> {
    let manifest = BackupManifest {
        id: prefixed_id("bkp"),
        workspace_id,
        content_hash: content_hash.to_string(),
        created_at: Utc::now(),
        metadata,
    };
    store.upsert_backup_manifest(&manifest).map_err(|e| e.to_string())?;
    Ok(manifest)
}

fn backup_manifest_metadata<const N: usize>(
    entries: [(&str, Value); N],
) -> BTreeMap<String, Value> {
    entries.into_iter().map(|(key, value)| (key.to_string(), value)).collect()
}

fn open_store(data_dir: PathBuf) -> Result<Store, String> {
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create data dir {}: {e}", data_dir.display()))?;
    Store::open(data_dir.join("yaku.sqlite")).map_err(|e| format!("Failed to open Yaku store: {e}"))
}

fn load_environment_variables(
    store: &Store,
    environment_id: &str,
) -> Result<BTreeMap<String, Value>, String> {
    let environment = store
        .get_environment(environment_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Environment '{environment_id}' not found"))?;
    Ok(environment.variables)
}

fn auto_prune_workspace_runs(
    service: &DomainService<Store>,
    bodies_dir: &Path,
    workspace_id: &str,
) -> Result<(), String> {
    let Some(keep_last) = workspace_run_retention(service.repository(), workspace_id)? else {
        return Ok(());
    };
    service
        .prune_runs(PruneRuns {
            scope: PruneRunsScope::Workspace { workspace_id: workspace_id.to_string() },
            keep_last,
        })
        .map_err(|e| e.to_string())?;
    gc_body_files(service.repository(), bodies_dir, false)?;
    Ok(())
}

fn workspace_run_retention(store: &Store, workspace_id: &str) -> Result<Option<u32>, String> {
    let Some(setting) =
        store.get_setting(&workspace_run_retention_key(workspace_id)).map_err(|e| e.to_string())?
    else {
        return Ok(None);
    };
    let keep_last = setting
        .value
        .as_u64()
        .ok_or_else(|| format!("Invalid run retention setting for workspace '{workspace_id}'"))?;
    u32::try_from(keep_last)
        .map(Some)
        .map_err(|_| format!("Run retention setting for workspace '{workspace_id}' is too large"))
}

fn workspace_run_retention_key(workspace_id: &str) -> String {
    format!("yaku.runRetention.workspace.{workspace_id}.keepLast")
}

fn prefixed_id(prefix: &str) -> String {
    let suffix: String = thread_rng().sample_iter(&Alphanumeric).take(12).map(char::from).collect();
    format!("{prefix}_{suffix}")
}

fn default_sort_key() -> String {
    Utc::now().timestamp_millis().to_string()
}

fn parse_config_json(value: String) -> Result<BTreeMap<String, Value>, String> {
    let value = serde_json::from_str::<Value>(&value)
        .map_err(|e| format!("Invalid request config JSON: {e}"))?;
    match value {
        Value::Object(map) => Ok(map.into_iter().collect()),
        _ => Err("Invalid request config JSON: expected an object".to_string()),
    }
}

fn parse_variables_json(value: String) -> Result<BTreeMap<String, Value>, String> {
    let value = serde_json::from_str::<Value>(&value)
        .map_err(|e| format!("Invalid environment variables JSON: {e}"))?;
    match value {
        Value::Object(map) => Ok(map.into_iter().collect()),
        _ => Err("Invalid environment variables JSON: expected an object".to_string()),
    }
}

fn parse_run_event_kind(value: &str) -> Result<RunEventKind, String> {
    serde_json::from_str::<RunEventKind>(&format!("{value:?}"))
        .map_err(|_| format!("Invalid run event kind '{value}'"))
}

fn parse_headers(values: Vec<String>) -> Result<Vec<Header>, String> {
    values
        .into_iter()
        .map(|value| {
            let (name, value) = parse_name_value(&value, "header")?;
            Ok(Header { name, value })
        })
        .collect()
}

fn parse_query(values: Vec<String>) -> Result<Vec<QueryParam>, String> {
    values
        .into_iter()
        .map(|value| {
            let (name, value) = parse_name_value(&value, "query")?;
            Ok(QueryParam { name, value, enabled: true })
        })
        .collect()
}

fn ensure_header(headers: &mut Vec<Header>, name: &str, value: &str) {
    if headers.iter().any(|header| header.name.eq_ignore_ascii_case(name)) {
        return;
    }
    headers.push(Header { name: name.to_string(), value: value.to_string() });
}

fn graphql_body(
    query: String,
    variables: Option<String>,
    operation_name: Option<String>,
) -> Result<String, String> {
    let variables = match variables {
        Some(value) => serde_json::from_str::<Value>(&value)
            .map_err(|e| format!("Invalid GraphQL variables JSON: {e}"))?,
        None => json!({}),
    };
    if !variables.is_object() {
        return Err("Invalid GraphQL variables JSON: expected an object".to_string());
    }

    let mut body = serde_json::Map::from_iter([
        ("query".to_string(), json!(query)),
        ("variables".to_string(), variables),
    ]);
    if let Some(operation_name) = operation_name {
        body.insert("operationName".to_string(), json!(operation_name));
    }
    serde_json::to_string(&Value::Object(body))
        .map_err(|e| format!("Failed to encode GraphQL request body: {e}"))
}

fn patched_graphql_parts(
    config: &BTreeMap<String, Value>,
    query: Option<String>,
    variables: Option<String>,
    clear_variables: bool,
    operation_name: Option<String>,
    clear_operation_name: bool,
) -> Result<(String, Value, Option<String>), String> {
    let body = config
        .get("body")
        .and_then(Value::as_str)
        .ok_or_else(|| "GraphQL request config is missing body".to_string())?;
    let body = serde_json::from_str::<Value>(body)
        .map_err(|e| format!("Invalid existing GraphQL request body: {e}"))?;

    let query = query
        .or_else(|| body.get("query").and_then(Value::as_str).map(str::to_string))
        .ok_or_else(|| "GraphQL request body is missing query".to_string())?;
    let variables = match (variables, clear_variables) {
        (Some(variables), _) => {
            let value = serde_json::from_str::<Value>(&variables)
                .map_err(|e| format!("Invalid GraphQL variables JSON: {e}"))?;
            if !value.is_object() {
                return Err("Invalid GraphQL variables JSON: expected an object".to_string());
            }
            value
        }
        (None, true) => json!({}),
        (None, false) => body.get("variables").cloned().unwrap_or_else(|| json!({})),
    };
    if !variables.is_object() {
        return Err("Invalid existing GraphQL variables: expected an object".to_string());
    }
    let operation_name = if clear_operation_name {
        None
    } else {
        operation_name
            .or_else(|| body.get("operationName").and_then(Value::as_str).map(str::to_string))
    };
    Ok((query, variables, operation_name))
}

fn parse_name_value(input: &str, label: &str) -> Result<(String, String), String> {
    let (name, value) = input
        .split_once('=')
        .ok_or_else(|| format!("Invalid {label} '{input}'; expected NAME=VALUE"))?;
    if name.trim().is_empty() {
        return Err(format!("Invalid {label} '{input}'; name cannot be empty"));
    }
    Ok((name.trim().to_string(), value.to_string()))
}

fn page_response<T>(items: Vec<T>) -> Value
where
    T: Serialize + HasCursor,
{
    let next_cursor = items.last().map(HasCursor::cursor);
    json!({ "items": items, "nextCursor": next_cursor })
}

trait HasCursor {
    fn cursor(&self) -> i64;
}

impl HasCursor for yaku_store::RunPageItem {
    fn cursor(&self) -> i64 {
        self.cursor
    }
}

impl HasCursor for yaku_store::RequestNodePageItem {
    fn cursor(&self) -> i64 {
        self.cursor
    }
}

impl HasCursor for yaku_store::WorkspacePageItem {
    fn cursor(&self) -> i64 {
        self.cursor
    }
}

impl HasCursor for yaku_store::BackupManifestPageItem {
    fn cursor(&self) -> i64 {
        self.cursor
    }
}

fn read_body_bytes(storage_kind: &BodyStorageKind, storage_ref: &str) -> Result<Vec<u8>, String> {
    match storage_kind {
        BodyStorageKind::Inline => {
            if let Some(text) = storage_ref.strip_prefix("inline:hex:") {
                decode_hex(text)
            } else if let Some(text) = storage_ref.strip_prefix("inline:") {
                Ok(text.as_bytes().to_vec())
            } else {
                Err(format!("Invalid inline body ref '{storage_ref}'"))
            }
        }
        BodyStorageKind::File => {
            let path = storage_ref
                .strip_prefix("file:")
                .ok_or_else(|| format!("Invalid file body ref '{storage_ref}'"))?;
            std::fs::read(path).map_err(|e| format!("Failed to read body file {path}: {e}"))
        }
        BodyStorageKind::Blob => {
            Err("Blob body storage is not supported by Yaku CLI yet".to_string())
        }
    }
}

fn gc_body_files(store: &Store, bodies_dir: &Path, dry_run: bool) -> Result<Value, String> {
    let referenced = referenced_body_files(store)?;
    let mut retained = 0_u64;
    let mut deleted = 0_u64;
    let mut bytes_deleted = 0_u64;

    if !bodies_dir.exists() {
        return Ok(json!({
            "deleted": deleted,
            "retained": retained,
            "bytesDeleted": bytes_deleted,
            "dryRun": dry_run,
        }));
    }

    let entries = std::fs::read_dir(bodies_dir)
        .map_err(|e| format!("Failed to read body directory {}: {e}", bodies_dir.display()))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read body directory entry: {e}"))?;
        let path = entry.path();
        let metadata = entry
            .metadata()
            .map_err(|e| format!("Failed to read body file metadata {}: {e}", path.display()))?;
        if !metadata.is_file() {
            continue;
        }

        let canonical = path
            .canonicalize()
            .map_err(|e| format!("Failed to canonicalize body file {}: {e}", path.display()))?;
        if referenced.contains(&canonical) {
            retained += 1;
            continue;
        }

        deleted += 1;
        bytes_deleted += metadata.len();
        if !dry_run {
            std::fs::remove_file(&path)
                .map_err(|e| format!("Failed to delete body file {}: {e}", path.display()))?;
        }
    }

    Ok(json!({
        "deleted": deleted,
        "retained": retained,
        "bytesDeleted": bytes_deleted,
        "dryRun": dry_run,
    }))
}

fn referenced_body_files(store: &Store) -> Result<BTreeSet<PathBuf>, String> {
    let mut referenced = BTreeSet::new();
    let bodies = store.list_all_run_bodies().map_err(|e| e.to_string())?;
    for body in bodies {
        if body.storage_kind != BodyStorageKind::File {
            continue;
        }
        let Some(path) = body.storage_ref.strip_prefix("file:") else {
            continue;
        };
        let path = PathBuf::from(path);
        if path.exists() {
            referenced.insert(path.canonicalize().map_err(|e| {
                format!("Failed to canonicalize referenced body file {}: {e}", path.display())
            })?);
        }
    }
    Ok(referenced)
}

fn decode_hex(input: &str) -> Result<Vec<u8>, String> {
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
