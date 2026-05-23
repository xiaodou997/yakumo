mod common;

use chrono::Utc;
use common::grpc_server::{TestReflectionServer, TestUnaryGrpcServer};
use common::http_server::TestHttpServer;
use common::websocket_server::TestWebSocketServer;
use common::{cli_cmd, parse_created_id};
use predicates::prelude::PredicateBooleanExt;
use predicates::str::contains;
use serde_json::json;
use std::fs;
use tempfile::TempDir;
use yaku_domain::{BodyStorageKind, Page, RunEventKind, Setting};
use yaku_store::Store;

fn backup_core(value: &serde_json::Value) -> serde_json::Value {
    json!({
        "formatVersion": value["formatVersion"].clone(),
        "contentHash": value["contentHash"].clone(),
        "workspace": value["workspace"].clone(),
        "environments": value["environments"].clone(),
        "requestTree": value["requestTree"].clone(),
        "requests": value["requests"].clone(),
        "runRetention": value["runRetention"].clone(),
    })
}

#[test]
fn yaku_workspace_and_request_round_trip() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();

    let create_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "Yaku Workspace"])
        .assert()
        .success()
        .stdout(contains("\"name\":\"Yaku Workspace\""));
    let workspace_id =
        parse_created_id(&create_workspace.get_output().stdout, "yaku workspace create");
    let second_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "Second Workspace"])
        .assert()
        .success();
    let second_workspace_id =
        parse_created_id(&second_workspace.get_output().stdout, "yaku workspace create");

    cli_cmd(data_dir)
        .args(["workspace", "list"])
        .assert()
        .success()
        .stdout(contains(format!(r#""id":"{workspace_id}""#)));

    cli_cmd(data_dir)
        .args(["workspace", "get", &workspace_id])
        .assert()
        .success()
        .stdout(contains("\"name\":\"Yaku Workspace\""));

    let first_workspace_page =
        cli_cmd(data_dir).args(["workspace", "list", "--limit", "1"]).assert().success();
    let first_workspace_json: serde_json::Value =
        serde_json::from_slice(&first_workspace_page.get_output().stdout).expect("workspace page");
    let first_workspace_items = first_workspace_json["items"].as_array().expect("workspace items");
    assert_eq!(first_workspace_items.len(), 1);
    assert_eq!(first_workspace_items[0]["id"], second_workspace_id);
    let workspace_cursor = first_workspace_json["nextCursor"].as_i64().expect("workspace cursor");

    let second_workspace_page = cli_cmd(data_dir)
        .args([
            "workspace",
            "list",
            "--limit",
            "1",
            "--cursor",
            &workspace_cursor.to_string(),
        ])
        .assert()
        .success();
    let second_workspace_json: serde_json::Value =
        serde_json::from_slice(&second_workspace_page.get_output().stdout).expect("workspace page");
    let second_workspace_items =
        second_workspace_json["items"].as_array().expect("workspace items");
    assert_eq!(second_workspace_items.len(), 1);
    assert_eq!(second_workspace_items[0]["id"], workspace_id);

    let create_request = cli_cmd(data_dir)
        .args([
            "request",
            "create",
            &workspace_id,
            "--name",
            "Health",
            "--method",
            "GET",
            "--url",
            "https://example.test",
        ])
        .assert()
        .success()
        .stdout(contains("\"name\":\"Health\""));
    let request_id = parse_created_id(&create_request.get_output().stdout, "yaku request create");

    cli_cmd(data_dir)
        .args(["request", "get", &request_id])
        .assert()
        .success()
        .stdout(contains("\"name\":\"Health\""))
        .stdout(contains("\"protocol\":\"http\""))
        .stdout(contains("\"url\":\"https://example.test\""));

    cli_cmd(data_dir)
        .args([
            "request",
            "patch-http",
            &request_id,
            "--name",
            "Status",
            "--method",
            "POST",
            "--url",
            "https://example.test/status",
            "--header",
            "X-Test=1",
            "--query",
            "debug=true",
            "--body",
            "ping",
            "--timeout-ms",
            "1234",
            "--no-follow-redirects",
        ])
        .assert()
        .success()
        .stdout(contains("\"name\":\"Status\""))
        .stdout(contains("\"method\":\"POST\""))
        .stdout(contains("\"url\":\"https://example.test/status\""))
        .stdout(contains("\"body\":\"ping\""))
        .stdout(contains("\"timeoutMs\":1234"))
        .stdout(contains("\"followRedirects\":false"));

    cli_cmd(data_dir)
        .args(["request", "list", &workspace_id])
        .assert()
        .success()
        .stdout(contains(format!(r#""requestId":"{request_id}""#)));

    let create_websocket = cli_cmd(data_dir)
        .args([
            "request",
            "create-websocket",
            &workspace_id,
            "--name",
            "Socket",
            "--url",
            "ws://example.test/socket",
            "--query",
            "room=general",
            "--message",
            "hello",
            "--max-messages",
            "1",
            "--timeout-ms",
            "1000",
        ])
        .assert()
        .success()
        .stdout(contains("\"protocol\":\"web_socket\""));
    let websocket_id =
        parse_created_id(&create_websocket.get_output().stdout, "yaku websocket create");

    let first_tree_page = cli_cmd(data_dir)
        .args(["request", "list", &workspace_id, "--limit", "1"])
        .assert()
        .success();
    let first_tree_json: serde_json::Value =
        serde_json::from_slice(&first_tree_page.get_output().stdout).expect("tree page json");
    let first_tree_items = first_tree_json["items"].as_array().expect("tree items");
    assert_eq!(first_tree_items.len(), 1);
    let next_cursor = first_tree_json["nextCursor"].as_i64().expect("tree next cursor");

    let second_tree_page = cli_cmd(data_dir)
        .args([
            "request",
            "list",
            &workspace_id,
            "--limit",
            "10",
            "--cursor",
            &next_cursor.to_string(),
        ])
        .assert()
        .success();
    let second_tree_json: serde_json::Value =
        serde_json::from_slice(&second_tree_page.get_output().stdout).expect("tree page json");
    let second_tree_items = second_tree_json["items"].as_array().expect("tree items");
    assert_eq!(second_tree_items.len(), 1);

    cli_cmd(data_dir)
        .args(["request", "list", &workspace_id])
        .assert()
        .success()
        .stdout(contains(format!(r#""requestId":"{websocket_id}""#)))
        .stdout(contains("\"name\":\"Socket\""));
}

#[test]
fn top_level_commands_use_yaku_store() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();

    let create_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "Top Workspace"])
        .assert()
        .success()
        .stdout(contains("\"name\":\"Top Workspace\""));
    let workspace_id = parse_created_id(&create_workspace.get_output().stdout, "workspace create");

    cli_cmd(data_dir)
        .args(["workspace", "list"])
        .assert()
        .success()
        .stdout(contains(format!(r#""id":"{workspace_id}""#)));

    let create_request = cli_cmd(data_dir)
        .args([
            "request",
            "create",
            &workspace_id,
            "--name",
            "Top Request",
            "--method",
            "GET",
            "--url",
            "https://example.test",
        ])
        .assert()
        .success()
        .stdout(contains("\"name\":\"Top Request\""));
    let request_id = parse_created_id(&create_request.get_output().stdout, "request create");

    cli_cmd(data_dir)
        .args(["request", "get", &request_id])
        .assert()
        .success()
        .stdout(contains("\"protocol\":\"http\""));

    assert!(data_dir.join("yaku.sqlite").exists());
    assert!(!data_dir.join("db.sqlite").exists());
    assert!(!data_dir.join("blobs.sqlite").exists());
}

#[test]
fn yaku_folder_list_skips_non_folder_nodes_before_cursor() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();

    let create_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "Folder Page Workspace"])
        .assert()
        .success();
    let workspace_id =
        parse_created_id(&create_workspace.get_output().stdout, "yaku workspace create");

    cli_cmd(data_dir)
        .args([
            "request",
            "create",
            &workspace_id,
            "--name",
            "Before Folder",
            "--url",
            "https://example.test",
        ])
        .assert()
        .success();

    let create_folder = cli_cmd(data_dir)
        .args(["folder", "create", &workspace_id, "--name", "Only Folder"])
        .assert()
        .success();
    let folder_id = parse_created_id(&create_folder.get_output().stdout, "yaku folder create");

    cli_cmd(data_dir)
        .args(["folder", "list", &workspace_id, "--limit", "1"])
        .assert()
        .success()
        .stdout(contains(format!(r#""id":"{folder_id}""#)))
        .stdout(contains("\"kind\":\"folder\""))
        .stdout(predicates::str::contains("\"kind\":\"request\"").not());
}

#[test]
fn yaku_environment_round_trip() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();

    let create_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "Env Workspace"])
        .assert()
        .success();
    let workspace_id =
        parse_created_id(&create_workspace.get_output().stdout, "yaku workspace create");

    let create_environment = cli_cmd(data_dir)
        .args([
            "environment",
            "create",
            &workspace_id,
            "--name",
            "Local",
            "--variables-json",
            r#"{"base_url":"https://example.test","retry":2}"#,
        ])
        .assert()
        .success()
        .stdout(contains("\"name\":\"Local\""))
        .stdout(contains("\"base_url\":\"https://example.test\""))
        .stdout(contains("\"retry\":2"));
    let environment_id =
        parse_created_id(&create_environment.get_output().stdout, "yaku environment create");

    cli_cmd(data_dir)
        .args(["environment", "list", &workspace_id])
        .assert()
        .success()
        .stdout(contains(format!(r#""id":"{environment_id}""#)))
        .stdout(contains("\"base_url\":\"https://example.test\""));

    cli_cmd(data_dir)
        .args(["environment", "get", &environment_id])
        .assert()
        .success()
        .stdout(contains("\"name\":\"Local\""));

    cli_cmd(data_dir)
        .args([
            "environment",
            "update",
            &environment_id,
            "--name",
            "Dev",
            "--variables-json",
            r#"{"token":"abc"}"#,
        ])
        .assert()
        .success()
        .stdout(contains("\"name\":\"Dev\""))
        .stdout(contains("\"token\":\"abc\""));

    cli_cmd(data_dir)
        .args(["environment", "delete", &environment_id])
        .assert()
        .success()
        .stdout(contains("\"deleted\":true"));

    cli_cmd(data_dir)
        .args(["environment", "list", &workspace_id])
        .assert()
        .success()
        .stdout(contains("[]"));
}

#[test]
fn yaku_backup_exports_workspace_core_data() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();

    let create_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "Backup Workspace"])
        .assert()
        .success();
    let workspace_id =
        parse_created_id(&create_workspace.get_output().stdout, "yaku workspace create");
    cli_cmd(data_dir)
        .args([
            "environment",
            "create",
            &workspace_id,
            "--name",
            "Local",
            "--variables-json",
            r#"{"base_url":"https://example.test"}"#,
        ])
        .assert()
        .success();
    cli_cmd(data_dir)
        .args(["run", "retention-set", &workspace_id, "--keep-last", "7"])
        .assert()
        .success();
    let create_folder = cli_cmd(data_dir)
        .args(["request", "create-folder", &workspace_id, "--name", "Core"])
        .assert()
        .success();
    let folder_id = parse_created_id(&create_folder.get_output().stdout, "yaku folder create");
    let create_request = cli_cmd(data_dir)
        .args([
            "request",
            "create",
            &workspace_id,
            "--name",
            "Health",
            "--url",
            "${[ base_url ]}/health",
            "--parent-id",
            &folder_id,
        ])
        .assert()
        .success();
    let request_id = parse_created_id(&create_request.get_output().stdout, "yaku request create");

    let export = cli_cmd(data_dir)
        .args(["backup", "export-workspace", &workspace_id])
        .assert()
        .success()
        .stdout(contains("\"formatVersion\": 2"))
        .stdout(contains("\"runRetention\": 7"))
        .stdout(contains("\"Backup Workspace\""))
        .stdout(contains("\"Local\""))
        .stdout(contains("${[ base_url ]}/health"));
    let export_json: serde_json::Value =
        serde_json::from_slice(&export.get_output().stdout).expect("workspace export json");
    assert_eq!(export_json["workspace"]["id"], workspace_id);
    assert_eq!(export_json["requests"][0]["id"], request_id);
    assert_eq!(export_json["requestTree"].as_array().expect("request tree").len(), 2);
    assert!(export_json["contentHash"].as_str().expect("content hash").len() > 0);

    let output = data_dir.join("backup").join("workspace.json");
    cli_cmd(data_dir)
        .args([
            "backup",
            "export-workspace",
            &workspace_id,
            "--output",
            output.to_str().expect("output path"),
        ])
        .assert()
        .success()
        .stdout(contains("\"bytes\""))
        .stdout(contains("\"manifestId\":\"bkp_"));
    let file_json: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&output).expect("export file read"))
            .expect("export file json");
    assert_eq!(file_json["workspace"]["id"], workspace_id);
    assert_eq!(file_json["contentHash"], export_json["contentHash"]);

    let store = Store::open(data_dir.join("yaku.sqlite")).expect("open yaku store");
    let manifests =
        store.list_backup_manifests(Some(&workspace_id)).expect("list backup manifests");
    assert_eq!(manifests.len(), 2);
    assert!(manifests.iter().all(|manifest| manifest.content_hash == export_json["contentHash"]));
    assert_eq!(manifests[0].metadata["action"], json!("export_workspace"));
    assert_eq!(manifests[0].metadata["outputKind"], json!("stdout"));
    assert_eq!(manifests[1].metadata["action"], json!("export_workspace"));
    assert_eq!(manifests[1].metadata["outputKind"], json!("file"));
    assert_eq!(manifests[1].metadata["outputPath"], json!(output.display().to_string()));
}

#[test]
fn yaku_backup_imports_workspace_round_trip_and_requires_replace_existing() {
    let source_temp_dir = TempDir::new().expect("Failed to create source temp dir");
    let source_data_dir = source_temp_dir.path();

    let create_workspace = cli_cmd(source_data_dir)
        .args(["workspace", "create", "--name", "Backup Workspace"])
        .assert()
        .success();
    let workspace_id =
        parse_created_id(&create_workspace.get_output().stdout, "yaku workspace create");
    let create_environment = cli_cmd(source_data_dir)
        .args([
            "environment",
            "create",
            &workspace_id,
            "--name",
            "Local",
            "--variables-json",
            r#"{"base_url":"https://example.test"}"#,
        ])
        .assert()
        .success();
    let environment_id =
        parse_created_id(&create_environment.get_output().stdout, "yaku environment create");
    cli_cmd(source_data_dir)
        .args(["run", "retention-set", &workspace_id, "--keep-last", "7"])
        .assert()
        .success();
    let create_folder = cli_cmd(source_data_dir)
        .args(["request", "create-folder", &workspace_id, "--name", "Core"])
        .assert()
        .success();
    let folder_id = parse_created_id(&create_folder.get_output().stdout, "yaku folder create");
    let create_request = cli_cmd(source_data_dir)
        .args([
            "request",
            "create",
            &workspace_id,
            "--name",
            "Health",
            "--url",
            "${[ base_url ]}/health",
            "--parent-id",
            &folder_id,
        ])
        .assert()
        .success();
    let request_id = parse_created_id(&create_request.get_output().stdout, "yaku request create");

    let export_path = source_data_dir.join("backup").join("workspace.json");
    let export_path_str = export_path.to_string_lossy().to_string();
    cli_cmd(source_data_dir)
        .args([
            "backup",
            "export-workspace",
            &workspace_id,
            "--output",
            &export_path_str,
        ])
        .assert()
        .success();
    let source_export_json: serde_json::Value =
        serde_json::from_slice(&fs::read(&export_path).expect("read source export"))
            .expect("parse source export");

    cli_cmd(source_data_dir)
        .args(["backup", "verify-workspace", &export_path_str])
        .assert()
        .success()
        .stdout(contains("\"verified\":true"))
        .stdout(contains("\"manifestId\":\"bkp_"))
        .stdout(contains(format!(r#""workspaceId":"{workspace_id}""#)));

    let tampered_path = source_data_dir.join("backup").join("tampered.json");
    let mut tampered_json = source_export_json.clone();
    tampered_json["contentHash"] = json!("deadbeef");
    fs::write(
        &tampered_path,
        format!(
            "{}\n",
            serde_json::to_string_pretty(&tampered_json).expect("serialize tampered json")
        ),
    )
    .expect("write tampered export");

    cli_cmd(source_data_dir)
        .args([
            "backup",
            "verify-workspace",
            tampered_path.to_str().expect("tampered path"),
        ])
        .assert()
        .failure()
        .stderr(contains("contentHash mismatch"));

    let target_temp_dir = TempDir::new().expect("Failed to create target temp dir");
    let target_data_dir = target_temp_dir.path();

    cli_cmd(target_data_dir)
        .args(["backup", "import-workspace", &export_path_str])
        .assert()
        .success()
        .stdout(contains("\"replacedExisting\":false"))
        .stdout(contains("\"manifestId\":\"bkp_"))
        .stdout(contains(format!(r#""workspaceId":"{workspace_id}""#)));

    let imported_export = cli_cmd(target_data_dir)
        .args(["backup", "export-workspace", &workspace_id])
        .assert()
        .success();
    let imported_export_json: serde_json::Value =
        serde_json::from_slice(&imported_export.get_output().stdout)
            .expect("parse imported export");
    assert_eq!(backup_core(&imported_export_json), backup_core(&source_export_json));

    cli_cmd(target_data_dir)
        .args(["backup", "import-workspace", &export_path_str])
        .assert()
        .failure()
        .stderr(contains("already exists"))
        .stderr(contains("--replace-existing"));

    let target_store = Store::open(target_data_dir.join("yaku.sqlite")).expect("open target store");
    let mut workspace = target_store
        .get_workspace(&workspace_id)
        .expect("get target workspace")
        .expect("target workspace exists");
    workspace.name = "Mutated Workspace".to_string();
    workspace.description = "Mutated description".to_string();
    workspace.updated_at = Utc::now();
    target_store.upsert_workspace(&workspace).expect("mutate workspace");
    target_store.delete_environment(&environment_id).expect("delete environment");
    target_store.delete_request_node(&folder_id).expect("delete request subtree");
    target_store
        .upsert_setting(&Setting {
            key: format!("yaku.runRetention.workspace.{workspace_id}.keepLast"),
            value: json!(99),
            updated_at: Utc::now(),
        })
        .expect("mutate run retention");
    assert!(
        target_store.get_request(&request_id).expect("get mutated request").is_none(),
        "request should be removed after deleting its parent folder"
    );

    let mutated_export = cli_cmd(target_data_dir)
        .args(["backup", "export-workspace", &workspace_id])
        .assert()
        .success();
    let mutated_export_json: serde_json::Value =
        serde_json::from_slice(&mutated_export.get_output().stdout).expect("parse mutated export");
    assert_ne!(backup_core(&mutated_export_json), backup_core(&source_export_json));

    cli_cmd(target_data_dir)
        .args([
            "backup",
            "import-workspace",
            &export_path_str,
            "--replace-existing",
        ])
        .assert()
        .success()
        .stdout(contains("\"manifestId\":\"bkp_"))
        .stdout(contains("\"replacedExisting\":true"));

    let replaced_export = cli_cmd(target_data_dir)
        .args(["backup", "export-workspace", &workspace_id])
        .assert()
        .success();
    let replaced_export_json: serde_json::Value =
        serde_json::from_slice(&replaced_export.get_output().stdout)
            .expect("parse replaced export");
    assert_eq!(backup_core(&replaced_export_json), backup_core(&source_export_json));

    let source_store = Store::open(source_data_dir.join("yaku.sqlite")).expect("open source store");
    let source_manifests =
        source_store.list_backup_manifests(Some(&workspace_id)).expect("list source manifests");
    assert_eq!(source_manifests.len(), 2);
    assert!(
        source_manifests
            .iter()
            .any(|manifest| manifest.metadata["action"] == json!("export_workspace"))
    );
    assert!(source_manifests.iter().any(|manifest| {
        manifest.metadata["action"] == json!("verify_workspace")
            && manifest.metadata["inputPath"] == json!(export_path_str)
    }));

    let final_target_store =
        Store::open(target_data_dir.join("yaku.sqlite")).expect("open final target store");
    let target_manifests = final_target_store
        .list_backup_manifests(Some(&workspace_id))
        .expect("list target manifests");
    assert_eq!(target_manifests.len(), 5);
    assert_eq!(
        target_manifests
            .iter()
            .filter(|manifest| manifest.metadata["action"] == json!("import_workspace"))
            .count(),
        2
    );
    assert_eq!(
        target_manifests
            .iter()
            .filter(|manifest| manifest.metadata["action"] == json!("export_workspace"))
            .count(),
        3
    );
    assert!(
        target_manifests
            .iter()
            .any(|manifest| { manifest.metadata.get("replacedExisting") == Some(&json!(false)) })
    );
    assert!(
        target_manifests
            .iter()
            .any(|manifest| { manifest.metadata.get("replacedExisting") == Some(&json!(true)) })
    );
    assert!(
        target_manifests
            .iter()
            .filter(|manifest| manifest.content_hash == source_export_json["contentHash"])
            .count()
            >= 4
    );
    assert!(
        target_manifests
            .iter()
            .any(|manifest| manifest.content_hash != source_export_json["contentHash"])
    );
}

#[test]
fn yaku_backup_list_manifests_pages_and_filters_results() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();

    let first_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "Manifest Alpha"])
        .assert()
        .success();
    let first_workspace_id =
        parse_created_id(&first_workspace.get_output().stdout, "yaku workspace create");
    let second_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "Manifest Beta"])
        .assert()
        .success();
    let second_workspace_id =
        parse_created_id(&second_workspace.get_output().stdout, "yaku workspace create");

    let first_output = data_dir.join("backup").join("alpha.json");
    let first_output_str = first_output.to_string_lossy().to_string();
    cli_cmd(data_dir)
        .args([
            "backup",
            "export-workspace",
            &first_workspace_id,
            "--output",
            &first_output_str,
        ])
        .assert()
        .success();
    let first_export_json: serde_json::Value =
        serde_json::from_slice(&fs::read(&first_output).expect("read first export"))
            .expect("parse first export");
    let first_hash = first_export_json["contentHash"].as_str().expect("first hash").to_string();

    cli_cmd(data_dir).args(["backup", "verify-workspace", &first_output_str]).assert().success();
    cli_cmd(data_dir).args(["backup", "export-workspace", &first_workspace_id]).assert().success();

    let second_output = data_dir.join("backup").join("beta.json");
    cli_cmd(data_dir)
        .args([
            "backup",
            "export-workspace",
            &second_workspace_id,
            "--output",
            second_output.to_str().expect("second output path"),
        ])
        .assert()
        .success();

    let first_page = cli_cmd(data_dir)
        .args([
            "backup",
            "list-manifests",
            "--workspace-id",
            &first_workspace_id,
            "--limit",
            "2",
        ])
        .assert()
        .success();
    let first_page_json: serde_json::Value =
        serde_json::from_slice(&first_page.get_output().stdout).expect("first manifest page");
    let first_page_items = first_page_json["items"].as_array().expect("first page items");
    assert_eq!(first_page_items.len(), 2);
    assert!(first_page_items.iter().all(|item| item["workspaceId"] == json!(first_workspace_id)));
    let first_cursor = first_page_json["nextCursor"].as_i64().expect("first page cursor");
    let first_manifest_id = first_page_items[0]["id"].as_str().expect("first manifest id");

    let get_manifest =
        cli_cmd(data_dir).args(["backup", "get-manifest", first_manifest_id]).assert().success();
    let get_manifest_json: serde_json::Value =
        serde_json::from_slice(&get_manifest.get_output().stdout).expect("get manifest json");
    assert_eq!(get_manifest_json["id"], json!(first_manifest_id));
    assert_eq!(get_manifest_json["workspaceId"], json!(first_workspace_id));
    assert_eq!(get_manifest_json["contentHash"], json!(first_hash));

    let second_page = cli_cmd(data_dir)
        .args([
            "backup",
            "list-manifests",
            "--workspace-id",
            &first_workspace_id,
            "--limit",
            "2",
            "--cursor",
            &first_cursor.to_string(),
        ])
        .assert()
        .success();
    let second_page_json: serde_json::Value =
        serde_json::from_slice(&second_page.get_output().stdout).expect("second manifest page");
    let second_page_items = second_page_json["items"].as_array().expect("second page items");
    assert_eq!(second_page_items.len(), 1);
    assert_eq!(second_page_items[0]["workspaceId"], json!(first_workspace_id));

    let hash_filtered = cli_cmd(data_dir)
        .args([
            "backup",
            "list-manifests",
            "--content-hash",
            &first_hash,
            "--limit",
            "10",
        ])
        .assert()
        .success();
    let hash_filtered_json: serde_json::Value =
        serde_json::from_slice(&hash_filtered.get_output().stdout).expect("hash filtered page");
    let hash_filtered_items = hash_filtered_json["items"].as_array().expect("hash filtered items");
    assert_eq!(hash_filtered_items.len(), 3);
    assert!(hash_filtered_items.iter().all(|item| item["contentHash"] == json!(first_hash)));
    assert!(
        hash_filtered_items.iter().all(|item| item["workspaceId"] == json!(first_workspace_id))
    );
    assert!(
        hash_filtered_items
            .iter()
            .any(|item| item["metadata"]["action"] == json!("verify_workspace"))
    );
    assert!(
        hash_filtered_items.iter().any(|item| item["metadata"]["outputKind"] == json!("stdout"))
    );

    let all_manifests =
        cli_cmd(data_dir).args(["backup", "list-manifests", "--limit", "10"]).assert().success();
    let all_manifests_json: serde_json::Value =
        serde_json::from_slice(&all_manifests.get_output().stdout).expect("all manifests page");
    let all_manifest_items = all_manifests_json["items"].as_array().expect("all manifest items");
    assert_eq!(all_manifest_items.len(), 4);
    assert!(
        all_manifest_items.iter().any(|item| item["workspaceId"] == json!(second_workspace_id))
    );

    cli_cmd(data_dir)
        .args(["backup", "get-manifest", "bkp_missing"])
        .assert()
        .failure()
        .stderr(contains("Backup manifest 'bkp_missing' not found"));
}

#[test]
fn yaku_request_tree_mutation_round_trip() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();

    let create_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "Tree Workspace"])
        .assert()
        .success();
    let workspace_id =
        parse_created_id(&create_workspace.get_output().stdout, "yaku workspace create");

    let create_folder = cli_cmd(data_dir)
        .args([
            "folder",
            "create",
            &workspace_id,
            "--name",
            "Core APIs",
            "--sort-key",
            "a",
        ])
        .assert()
        .success()
        .stdout(contains("\"kind\":\"folder\""));
    let folder_id = parse_created_id(&create_folder.get_output().stdout, "yaku folder create");

    cli_cmd(data_dir)
        .args(["folder", "get", &folder_id])
        .assert()
        .success()
        .stdout(contains(format!(r#""id":"{folder_id}""#)))
        .stdout(contains("\"name\":\"Core APIs\""));

    cli_cmd(data_dir)
        .args(["folder", "update", &folder_id, "--name", "Core"])
        .assert()
        .success()
        .stdout(contains("\"name\":\"Core\""));

    let create_archive = cli_cmd(data_dir)
        .args([
            "folder",
            "create",
            &workspace_id,
            "--name",
            "Archive",
            "--sort-key",
            "z",
        ])
        .assert()
        .success();
    let archive_id = parse_created_id(&create_archive.get_output().stdout, "yaku archive create");

    cli_cmd(data_dir)
        .args(["folder", "list", &workspace_id])
        .assert()
        .success()
        .stdout(contains(format!(r#""id":"{folder_id}""#)))
        .stdout(contains(format!(r#""id":"{archive_id}""#)));

    let create_request = cli_cmd(data_dir)
        .args([
            "request",
            "create",
            &workspace_id,
            "--name",
            "Health",
            "--method",
            "GET",
            "--url",
            "https://example.test",
            "--parent-id",
            &folder_id,
            "--sort-key",
            "b",
        ])
        .assert()
        .success();
    let request_id = parse_created_id(&create_request.get_output().stdout, "yaku request create");

    let store = Store::open(data_dir.join("yaku.sqlite")).expect("open yaku store");
    let tree = store.list_request_tree(&workspace_id).expect("tree read");
    let request_node = tree
        .iter()
        .find(|node| node.request_id.as_deref() == Some(request_id.as_str()))
        .expect("request node");
    assert_eq!(request_node.parent_id.as_deref(), Some(folder_id.as_str()));
    assert_eq!(request_node.sort_key, "b");
    let request_node_id = request_node.id.clone();

    cli_cmd(data_dir)
        .args(["request", "get-node", &request_node_id])
        .assert()
        .success()
        .stdout(contains(format!(r#""id":"{request_node_id}""#)))
        .stdout(contains(format!(r#""requestId":"{request_id}""#)))
        .stdout(contains("\"request\":"))
        .stdout(contains("\"name\":\"Health\""));

    cli_cmd(data_dir)
        .args(["request", "get-node", &folder_id])
        .assert()
        .success()
        .stdout(contains(format!(r#""id":"{folder_id}""#)))
        .stdout(contains("\"kind\":\"folder\""))
        .stdout(contains("\"request\":null"));

    let duplicate_request = cli_cmd(data_dir)
        .args([
            "request",
            "duplicate",
            &request_id,
            "--name",
            "Health Copy",
            "--parent-id",
            &archive_id,
            "--sort-key",
            "d",
        ])
        .assert()
        .success()
        .stdout(contains("\"name\":\"Health Copy\""))
        .stdout(contains("\"protocol\":\"http\""))
        .stdout(contains("\"url\":\"https://example.test\""));
    let duplicate_id =
        parse_created_id(&duplicate_request.get_output().stdout, "yaku request duplicate");
    assert_ne!(duplicate_id, request_id);

    let tree = store.list_request_tree(&workspace_id).expect("tree read");
    let duplicate_node = tree
        .iter()
        .find(|node| node.request_id.as_deref() == Some(duplicate_id.as_str()))
        .expect("duplicate node");
    assert_eq!(duplicate_node.parent_id.as_deref(), Some(archive_id.as_str()));
    assert_eq!(duplicate_node.sort_key, "d");

    cli_cmd(data_dir)
        .args([
            "request",
            "move",
            &request_node_id,
            "--parent-id",
            &archive_id,
            "--sort-key",
            "c",
        ])
        .assert()
        .success()
        .stdout(contains(format!(r#""parentId":"{archive_id}""#)));

    cli_cmd(data_dir)
        .args(["request", "update", &request_id, "--name", "Ping"])
        .assert()
        .success()
        .stdout(contains("\"name\":\"Ping\""));

    cli_cmd(data_dir)
        .args(["request", "list", &workspace_id])
        .assert()
        .success()
        .stdout(contains("\"name\":\"Ping\""))
        .stdout(contains(format!(r#""parentId":"{archive_id}""#)));

    cli_cmd(data_dir)
        .args(["folder", "delete", &archive_id])
        .assert()
        .success()
        .stdout(contains("\"deleted\":true"));

    let store = Store::open(data_dir.join("yaku.sqlite")).expect("reopen yaku store");
    assert!(store.get_request(&request_id).expect("request read").is_none());
    assert!(store.get_request(&duplicate_id).expect("duplicate read").is_none());
    assert!(store.get_request_node(&request_node_id).expect("node read").is_none());
    assert!(store.get_request_node(&archive_id).expect("archive read").is_none());
    assert!(store.get_request_node(&folder_id).expect("folder read").is_some());

    cli_cmd(data_dir)
        .args(["workspace", "delete", &workspace_id])
        .assert()
        .success()
        .stdout(contains("\"deleted\":true"));
    let store = Store::open(data_dir.join("yaku.sqlite")).expect("reopen yaku store");
    assert!(store.get_workspace(&workspace_id).expect("workspace read").is_none());
}

#[test]
fn yaku_send_records_run_events_and_response_body() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();
    let server = TestHttpServer::spawn_ok("hello-yaku");

    let create_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "Send Workspace"])
        .assert()
        .success();
    let workspace_id =
        parse_created_id(&create_workspace.get_output().stdout, "yaku workspace create");
    let create_environment = cli_cmd(data_dir)
        .args([
            "environment",
            "create",
            &workspace_id,
            "--name",
            "Local",
            "--variables-json",
            &format!(r#"{{"base_url":"{}","token":"present","alpha":"1"}}"#, server.url),
        ])
        .assert()
        .success();
    let environment_id =
        parse_created_id(&create_environment.get_output().stdout, "yaku environment create");

    let create_request = cli_cmd(data_dir)
        .args([
            "request",
            "create",
            &workspace_id,
            "--name",
            "Send Request",
            "--method",
            "POST",
            "--url",
            "${[ base_url ]}",
            "--header",
            "X-Yaku=${[ token ]}",
            "--query",
            "alpha=${[ alpha ]}",
            "--body",
            "ping ${[ token ]}",
            "--timeout-ms",
            "5000",
            "--no-follow-redirects",
        ])
        .assert()
        .success();
    let request_id = parse_created_id(&create_request.get_output().stdout, "yaku request create");

    let send = cli_cmd(data_dir)
        .args(["--environment", &environment_id, "send", &request_id])
        .assert()
        .success()
        .stdout(contains("\"state\":\"completed\""))
        .stdout(contains("\"statusCode\":200"));
    let run_id = parse_created_id(&send.get_output().stdout, "yaku send");

    cli_cmd(data_dir)
        .args(["run", "get", &run_id])
        .assert()
        .success()
        .stdout(contains(format!(r#""id":"{run_id}""#)))
        .stdout(contains("\"state\":\"completed\""));

    let received_request = server.request_text();
    assert!(received_request.starts_with("POST /test?alpha=1 HTTP/1.1"));
    assert!(received_request.to_ascii_lowercase().contains("x-yaku: present"));
    assert!(received_request.ends_with("ping present"));

    cli_cmd(data_dir)
        .args(["run", "list", &request_id])
        .assert()
        .success()
        .stdout(contains(format!(r#""id":"{run_id}""#)))
        .stdout(contains("\"state\":\"completed\""));

    cli_cmd(data_dir)
        .args(["run", "list-workspace", &workspace_id])
        .assert()
        .success()
        .stdout(contains(format!(r#""id":"{run_id}""#)))
        .stdout(contains(format!(r#""requestId":"{request_id}""#)));

    cli_cmd(data_dir)
        .args(["run", "events", &run_id])
        .assert()
        .success()
        .stdout(contains("\"kind\":\"request_snapshot\""))
        .stdout(contains(format!(r#""url":"{}""#, server.url)))
        .stdout(contains("\"X-Yaku\""))
        .stdout(contains("\"present\""))
        .stdout(contains("\"kind\":\"request_body\""))
        .stdout(contains("\"kind\":\"response_headers\""))
        .stdout(contains("\"kind\":\"response_body\""));

    cli_cmd(data_dir)
        .args(["run", "events", &run_id, "--kind", "request_snapshot"])
        .assert()
        .success()
        .stdout(contains("\"kind\":\"request_snapshot\""))
        .stdout(contains(format!(r#""url":"{}""#, server.url)))
        .stdout(predicates::str::contains("\"kind\":\"response_body\"").not());

    cli_cmd(data_dir)
        .args(["run", "snapshot", &run_id])
        .assert()
        .success()
        .stdout(contains("\"kind\":\"request_snapshot\""))
        .stdout(contains(format!(r#""url":"{}""#, server.url)))
        .stdout(contains("\"ping present\""));

    let bodies_output = cli_cmd(data_dir)
        .args(["run", "bodies", &run_id])
        .assert()
        .success()
        .stdout(contains("\"storageKind\":\"inline\""))
        .stdout(contains(format!(r#""byteLength":{}"#, "hello-yaku".len())));
    let bodies_json: serde_json::Value =
        serde_json::from_slice(&bodies_output.get_output().stdout).expect("bodies json");
    let body_id = bodies_json
        .as_array()
        .and_then(|bodies| bodies.first())
        .and_then(|body| body.get("id"))
        .and_then(serde_json::Value::as_str)
        .expect("body id");

    cli_cmd(data_dir)
        .args(["run", "body", body_id])
        .assert()
        .success()
        .stdout(contains("hello-yaku"));

    let store = Store::open(data_dir.join("yaku.sqlite")).expect("Failed to open yaku store");
    let events =
        store.list_run_events(&run_id, Page::first(20)).expect("Failed to list run events");
    assert!(
        events.iter().any(|event| event.kind == RunEventKind::ResponseHeaders),
        "send should record response headers"
    );
    assert!(
        events.iter().any(|event| event.kind == RunEventKind::ResponseBody),
        "send should record response body event"
    );

    let bodies = store.list_run_bodies(&run_id).expect("Failed to list run bodies");
    assert_eq!(bodies.len(), 1);
    assert_eq!(bodies[0].byte_length, "hello-yaku".len() as i64);
    assert_eq!(bodies[0].storage_kind, BodyStorageKind::Inline);

    cli_cmd(data_dir)
        .args(["run", "delete", &run_id])
        .assert()
        .success()
        .stdout(contains("\"deleted\":true"));

    let store = Store::open(data_dir.join("yaku.sqlite")).expect("Failed to reopen yaku store");
    assert!(store.get_run(&run_id).expect("run read").is_none());
    assert!(store.list_run_events(&run_id, Page::first(20)).expect("events").is_empty());
    assert!(store.list_run_bodies(&run_id).expect("bodies").is_empty());
}

#[test]
fn yaku_run_prune_keeps_newest_runs() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();
    let server = TestHttpServer::spawn_ok("hello-yaku");

    let create_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "Prune Workspace"])
        .assert()
        .success();
    let workspace_id =
        parse_created_id(&create_workspace.get_output().stdout, "yaku workspace create");

    let create_request = cli_cmd(data_dir)
        .args([
            "request",
            "create",
            &workspace_id,
            "--name",
            "Prune Request",
            "--url",
            &server.url,
        ])
        .assert()
        .success();
    let request_id = parse_created_id(&create_request.get_output().stdout, "yaku request create");

    let mut run_ids = Vec::new();
    for _ in 0..3 {
        let send = cli_cmd(data_dir).args(["send", &request_id]).assert().success();
        run_ids.push(parse_created_id(&send.get_output().stdout, "yaku send"));
    }

    let first_page =
        cli_cmd(data_dir).args(["run", "list", &request_id, "--limit", "2"]).assert().success();
    let first_page_json: serde_json::Value =
        serde_json::from_slice(&first_page.get_output().stdout).expect("run page json");
    let first_items = first_page_json["items"].as_array().expect("first page items");
    assert_eq!(first_items.len(), 2);
    assert_eq!(first_items[0]["id"], run_ids[2]);
    assert_eq!(first_items[1]["id"], run_ids[1]);
    let next_cursor = first_page_json["nextCursor"].as_i64().expect("next cursor");

    let second_page = cli_cmd(data_dir)
        .args([
            "run",
            "list",
            &request_id,
            "--limit",
            "2",
            "--cursor",
            &next_cursor.to_string(),
        ])
        .assert()
        .success();
    let second_page_json: serde_json::Value =
        serde_json::from_slice(&second_page.get_output().stdout).expect("run page json");
    let second_items = second_page_json["items"].as_array().expect("second page items");
    assert_eq!(second_items.len(), 1);
    assert_eq!(second_items[0]["id"], run_ids[0]);

    cli_cmd(data_dir)
        .args([
            "run",
            "prune",
            "--request-id",
            &request_id,
            "--keep-last",
            "1",
        ])
        .assert()
        .success()
        .stdout(contains("\"deleted\":2"))
        .stdout(contains("\"keepLast\":1"));

    let store = Store::open(data_dir.join("yaku.sqlite")).expect("Failed to open yaku store");
    let remaining = store.list_runs_for_request(&request_id, Page::first(10)).expect("runs");
    assert_eq!(remaining.len(), 1);
    assert_eq!(remaining[0].id, run_ids[2]);
    assert!(store.get_run(&run_ids[0]).expect("old run read").is_none());
    assert!(store.list_run_events(&run_ids[0], Page::first(20)).expect("events").is_empty());

    cli_cmd(data_dir)
        .args([
            "run",
            "prune",
            "--workspace-id",
            &workspace_id,
            "--keep-last",
            "0",
        ])
        .assert()
        .success()
        .stdout(contains("\"deleted\":1"));
    let remaining = store.list_runs_for_workspace(&workspace_id, Page::first(10)).expect("runs");
    assert!(remaining.is_empty());
}

#[test]
fn yaku_run_retention_auto_prunes_workspace_runs() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();
    let server = TestHttpServer::spawn_ok("hello-yaku");

    let create_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "Retention Workspace"])
        .assert()
        .success();
    let workspace_id =
        parse_created_id(&create_workspace.get_output().stdout, "yaku workspace create");

    cli_cmd(data_dir)
        .args(["run", "retention-get", &workspace_id])
        .assert()
        .success()
        .stdout(contains("\"keepLast\":null"));
    cli_cmd(data_dir)
        .args(["run", "retention-set", &workspace_id, "--keep-last", "2"])
        .assert()
        .success()
        .stdout(contains("\"keepLast\":2"));

    let create_request = cli_cmd(data_dir)
        .args([
            "request",
            "create",
            &workspace_id,
            "--name",
            "Retention Request",
            "--url",
            &server.url,
            "--timeout-ms",
            "1000",
        ])
        .assert()
        .success();
    let request_id = parse_created_id(&create_request.get_output().stdout, "yaku request create");

    let mut run_ids = Vec::new();
    for _ in 0..3 {
        let send = cli_cmd(data_dir).args(["send", &request_id]).assert().success();
        run_ids.push(parse_created_id(&send.get_output().stdout, "yaku send"));
    }

    let store = Store::open(data_dir.join("yaku.sqlite")).expect("Failed to open yaku store");
    let remaining = store.list_runs_for_workspace(&workspace_id, Page::first(10)).expect("runs");
    assert_eq!(remaining.len(), 2);
    assert_eq!(remaining[0].id, run_ids[2]);
    assert_eq!(remaining[1].id, run_ids[1]);
    assert!(store.get_run(&run_ids[0]).expect("pruned run read").is_none());

    cli_cmd(data_dir)
        .args(["run", "retention-clear", &workspace_id])
        .assert()
        .success()
        .stdout(contains("\"keepLast\":null"));
}

#[test]
fn yaku_run_gc_bodies_deletes_unreferenced_body_files() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();
    let server = TestHttpServer::spawn_with_body(vec![b'x'; 70 * 1024]);

    let create_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "GC Workspace"])
        .assert()
        .success();
    let workspace_id =
        parse_created_id(&create_workspace.get_output().stdout, "yaku workspace create");

    let create_request = cli_cmd(data_dir)
        .args([
            "request",
            "create",
            &workspace_id,
            "--name",
            "Large Response",
            "--url",
            &server.url,
        ])
        .assert()
        .success();
    let request_id = parse_created_id(&create_request.get_output().stdout, "yaku request create");

    let send = cli_cmd(data_dir).args(["send", &request_id]).assert().success();
    let run_id = parse_created_id(&send.get_output().stdout, "yaku send");
    let store = Store::open(data_dir.join("yaku.sqlite")).expect("Failed to open yaku store");
    let bodies = store.list_run_bodies(&run_id).expect("body list");
    assert_eq!(bodies.len(), 1);
    assert_eq!(bodies[0].storage_kind, BodyStorageKind::File);
    let body_path = bodies[0]
        .storage_ref
        .strip_prefix("file:")
        .map(std::path::PathBuf::from)
        .expect("file body ref");
    assert!(body_path.exists());

    cli_cmd(data_dir)
        .args(["run", "gc-bodies", "--dry-run"])
        .assert()
        .success()
        .stdout(contains("\"deleted\":0"))
        .stdout(contains("\"retained\":1"))
        .stdout(contains("\"dryRun\":true"));
    assert!(body_path.exists());

    cli_cmd(data_dir)
        .args(["run", "delete", &run_id])
        .assert()
        .success()
        .stdout(contains("\"bodyGc\""))
        .stdout(contains("\"deleted\":1"))
        .stdout(contains("\"retained\":0"));
    assert!(!body_path.exists());

    cli_cmd(data_dir)
        .args(["run", "gc-bodies"])
        .assert()
        .success()
        .stdout(contains("\"deleted\":0"))
        .stdout(contains("\"retained\":0"))
        .stdout(contains("\"dryRun\":false"));
}

#[test]
fn yaku_request_delete_runs_body_gc() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();
    let server = TestHttpServer::spawn_with_body(vec![b'y'; 70 * 1024]);

    let create_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "Request GC Workspace"])
        .assert()
        .success();
    let workspace_id =
        parse_created_id(&create_workspace.get_output().stdout, "yaku workspace create");

    let create_request = cli_cmd(data_dir)
        .args([
            "request",
            "create",
            &workspace_id,
            "--name",
            "Large Request",
            "--url",
            &server.url,
        ])
        .assert()
        .success();
    let request_id = parse_created_id(&create_request.get_output().stdout, "yaku request create");

    let send = cli_cmd(data_dir).args(["send", &request_id]).assert().success();
    let run_id = parse_created_id(&send.get_output().stdout, "yaku send");
    let store = Store::open(data_dir.join("yaku.sqlite")).expect("Failed to open yaku store");
    let bodies = store.list_run_bodies(&run_id).expect("body list");
    let body_path = bodies[0]
        .storage_ref
        .strip_prefix("file:")
        .map(std::path::PathBuf::from)
        .expect("file body ref");
    assert!(body_path.exists());

    let tree = store.list_request_tree(&workspace_id).expect("tree read");
    let request_node_id = tree
        .iter()
        .find(|node| node.request_id.as_deref() == Some(request_id.as_str()))
        .expect("request node")
        .id
        .clone();

    cli_cmd(data_dir)
        .args(["request", "delete", &request_node_id])
        .assert()
        .success()
        .stdout(contains("\"bodyGc\""))
        .stdout(contains("\"deleted\":1"))
        .stdout(contains("\"retained\":0"));
    assert!(!body_path.exists());
}

#[test]
fn yaku_graphql_request_sends_json_body_through_run_model() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();
    let server = TestHttpServer::spawn_ok("{\"data\":{\"ping\":\"pong\"}}");

    let create_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "GraphQL Workspace"])
        .assert()
        .success();
    let workspace_id =
        parse_created_id(&create_workspace.get_output().stdout, "yaku workspace create");

    let create_request = cli_cmd(data_dir)
        .args([
            "request",
            "create-graphql",
            &workspace_id,
            "--name",
            "Ping GraphQL",
            "--url",
            &server.url,
            "--query",
            "query Ping($id: ID!) { ping(id: $id) }",
            "--variables",
            r#"{"id":"123"}"#,
            "--operation-name",
            "Ping",
            "--header",
            "X-GraphQL=yes",
        ])
        .assert()
        .success()
        .stdout(contains("\"protocol\":\"graphql\""));
    let request_id = parse_created_id(&create_request.get_output().stdout, "yaku graphql create");

    cli_cmd(data_dir)
        .args([
            "request",
            "patch-graphql",
            &request_id,
            "--name",
            "Patched GraphQL",
            "--query",
            "query Patched($id: ID!) { patched(id: $id) }",
            "--variables",
            r#"{"id":"456"}"#,
            "--operation-name",
            "Patched",
            "--header",
            "X-GraphQL=patched",
            "--timeout-ms",
            "2222",
            "--no-follow-redirects",
        ])
        .assert()
        .success()
        .stdout(contains("\"name\":\"Patched GraphQL\""))
        .stdout(contains("query Patched($id: ID!)"))
        .stdout(contains("\\\"id\\\":\\\"456\\\""))
        .stdout(contains("\\\"operationName\\\":\\\"Patched\\\""))
        .stdout(contains("\"timeoutMs\":2222"))
        .stdout(contains("\"followRedirects\":false"));

    let send = cli_cmd(data_dir)
        .args(["send", &request_id])
        .assert()
        .success()
        .stdout(contains("\"protocol\":\"graphql\""))
        .stdout(contains("\"state\":\"completed\""));
    let run_id = parse_created_id(&send.get_output().stdout, "yaku graphql send");

    let received_request = server.request_text();
    assert!(received_request.starts_with("POST /test HTTP/1.1"));
    assert!(received_request.to_ascii_lowercase().contains("content-type: application/json"));
    assert!(received_request.to_ascii_lowercase().contains("x-graphql: patched"));
    assert!(received_request.contains(r#""query":"query Patched($id: ID!) { patched(id: $id) }""#));
    assert!(received_request.contains(r#""variables":{"id":"456"}"#));
    assert!(received_request.contains(r#""operationName":"Patched""#));

    cli_cmd(data_dir)
        .args(["run", "events", &run_id])
        .assert()
        .success()
        .stdout(contains("\"kind\":\"request_body\""))
        .stdout(contains("\"kind\":\"response_body\""));

    let bodies_output = cli_cmd(data_dir)
        .args(["run", "bodies", &run_id])
        .assert()
        .success()
        .stdout(contains("\"byteLength\":24"));
    let bodies_json: serde_json::Value =
        serde_json::from_slice(&bodies_output.get_output().stdout).expect("bodies json");
    let body_id = bodies_json
        .as_array()
        .and_then(|bodies| bodies.first())
        .and_then(|body| body.get("id"))
        .and_then(serde_json::Value::as_str)
        .expect("body id");

    cli_cmd(data_dir)
        .args(["run", "body", body_id])
        .assert()
        .success()
        .stdout(contains(r#""ping":"pong""#));
}

#[test]
fn yaku_graphql_request_rejects_non_object_variables() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();

    let create_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "Invalid GraphQL"])
        .assert()
        .success();
    let workspace_id =
        parse_created_id(&create_workspace.get_output().stdout, "yaku workspace create");

    cli_cmd(data_dir)
        .args([
            "request",
            "create-graphql",
            &workspace_id,
            "--name",
            "Bad Variables",
            "--url",
            "https://example.test/graphql",
            "--query",
            "query Ping { ping }",
            "--variables",
            r#"["not-object"]"#,
        ])
        .assert()
        .failure()
        .stderr(contains("expected an object"));
}

#[test]
fn yaku_sse_request_records_stream_messages_as_run_events() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();
    let server = TestHttpServer::spawn_with_headers(
        "id: 1\nevent: ready\ndata: hello\n\nid: 2\nevent: update\ndata: world\n\n",
        &["Content-Type: text/event-stream"],
    );

    let create_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "SSE Workspace"])
        .assert()
        .success();
    let workspace_id =
        parse_created_id(&create_workspace.get_output().stdout, "yaku workspace create");

    let create_request = cli_cmd(data_dir)
        .args([
            "request",
            "create-sse",
            &workspace_id,
            "--name",
            "Events",
            "--url",
            &server.url,
            "--header",
            "X-SSE=yes",
            "--query",
            "channel=updates",
        ])
        .assert()
        .success()
        .stdout(contains("\"protocol\":\"sse\""));
    let request_id = parse_created_id(&create_request.get_output().stdout, "yaku sse create");

    cli_cmd(data_dir)
        .args([
            "request",
            "patch-sse",
            &request_id,
            "--name",
            "Patched Events",
            "--header",
            "X-SSE=patched",
            "--query",
            "channel=patched",
            "--timeout-ms",
            "3333",
            "--no-follow-redirects",
        ])
        .assert()
        .success()
        .stdout(contains("\"name\":\"Patched Events\""))
        .stdout(contains("\"value\":\"patched\""))
        .stdout(contains("\"timeoutMs\":3333"))
        .stdout(contains("\"followRedirects\":false"));

    let send = cli_cmd(data_dir)
        .args(["send", &request_id])
        .assert()
        .success()
        .stdout(contains("\"protocol\":\"sse\""))
        .stdout(contains("\"state\":\"completed\""));
    let run_id = parse_created_id(&send.get_output().stdout, "yaku sse send");

    let received_request = server.request_text();
    assert!(received_request.starts_with("GET /test?channel=patched HTTP/1.1"));
    assert!(received_request.to_ascii_lowercase().contains("accept: text/event-stream"));
    assert!(received_request.to_ascii_lowercase().contains("x-sse: patched"));

    cli_cmd(data_dir)
        .args(["run", "events", &run_id])
        .assert()
        .success()
        .stdout(contains("\"kind\":\"message\""))
        .stdout(contains("\"event\":\"ready\""))
        .stdout(contains("\"data\":\"hello\""))
        .stdout(contains("\"event\":\"update\""))
        .stdout(contains("\"data\":\"world\""))
        .stdout(contains("\"kind\":\"complete\""));
}

#[test]
fn yaku_websocket_request_sends_real_message_through_run_model() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();
    let server = TestWebSocketServer::spawn();

    let create_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "WebSocket Workspace"])
        .assert()
        .success();
    let workspace_id =
        parse_created_id(&create_workspace.get_output().stdout, "yaku workspace create");

    let create_request = cli_cmd(data_dir)
        .args([
            "request",
            "create-websocket",
            &workspace_id,
            "--name",
            "Socket",
            "--url",
            &server.url,
            "--header",
            "X-WS=yes",
            "--query",
            "room=general",
            "--message",
            "ping",
            "--max-messages",
            "1",
            "--timeout-ms",
            "5000",
        ])
        .assert()
        .success()
        .stdout(contains("\"protocol\":\"web_socket\""));
    let request_id = parse_created_id(&create_request.get_output().stdout, "yaku websocket create");

    cli_cmd(data_dir)
        .args([
            "request",
            "patch-websocket",
            &request_id,
            "--name",
            "Patched Socket",
            "--header",
            "X-WS=patched",
            "--query",
            "room=patched",
            "--message",
            "patched",
            "--max-messages",
            "1",
            "--timeout-ms",
            "6000",
        ])
        .assert()
        .success()
        .stdout(contains("\"name\":\"Patched Socket\""))
        .stdout(contains("\"value\":\"patched\""))
        .stdout(contains("\"maxMessages\":1"))
        .stdout(contains("\"timeoutMs\":6000"));

    let send = cli_cmd(data_dir)
        .args(["send", &request_id])
        .assert()
        .success()
        .stdout(contains("\"protocol\":\"web_socket\""))
        .stdout(contains("\"state\":\"completed\""))
        .stdout(contains("\"statusCode\":101"));
    let run_id = parse_created_id(&send.get_output().stdout, "yaku websocket send");

    server.join();
    let received_request = server.request_text();
    assert!(received_request.starts_with("/socket?room=patched"));
    assert!(received_request.to_ascii_lowercase().contains("x-ws: patched"));

    cli_cmd(data_dir)
        .args(["run", "events", &run_id])
        .assert()
        .success()
        .stdout(contains("\"direction\":\"sent\""))
        .stdout(contains("\"text\":\"patched\""))
        .stdout(contains("\"direction\":\"received\""))
        .stdout(contains("\"text\":\"echo:patched\""))
        .stdout(contains("\"kind\":\"complete\""));
}

#[test]
fn yaku_grpc_request_records_failed_run_when_reflection_is_disabled() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();

    let create_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "gRPC Workspace"])
        .assert()
        .success();
    let workspace_id =
        parse_created_id(&create_workspace.get_output().stdout, "yaku workspace create");

    let create_request = cli_cmd(data_dir)
        .args([
            "request",
            "create-grpc",
            &workspace_id,
            "--name",
            "Ping RPC",
            "--url",
            "http://127.0.0.1:50051",
            "--service",
            "example.PingService",
            "--method",
            "Ping",
            "--metadata",
            "authorization=Bearer test",
            "--message",
            r#"{"name":"yakumo"}"#,
            "--proto-file",
            "ping.proto",
            "--no-reflection",
            "--timeout-ms",
            "5000",
        ])
        .assert()
        .success()
        .stdout(contains("\"protocol\":\"grpc\""));
    let request_id = parse_created_id(&create_request.get_output().stdout, "yaku grpc create");

    cli_cmd(data_dir)
        .args([
            "request",
            "patch-grpc",
            &request_id,
            "--name",
            "Patched RPC",
            "--service",
            "example.PatchedService",
            "--method",
            "Patched",
            "--metadata",
            "authorization=Bearer patched",
            "--message",
            r#"{"name":"patched"}"#,
            "--proto-file",
            "patched.proto",
            "--reflection",
            "--timeout-ms",
            "6000",
        ])
        .assert()
        .success()
        .stdout(contains("\"name\":\"Patched RPC\""))
        .stdout(contains("\"service\":\"example.PatchedService\""))
        .stdout(contains("\"method\":\"Patched\""))
        .stdout(contains("Bearer patched"))
        .stdout(contains("\"message\":\"{\\\"name\\\":\\\"patched\\\"}\""))
        .stdout(contains("\"patched.proto\""))
        .stdout(contains("\"useReflection\":true"))
        .stdout(contains("\"timeoutMs\":6000"));

    let send = cli_cmd(data_dir)
        .args(["send", &request_id])
        .assert()
        .success()
        .stdout(contains("\"protocol\":\"grpc\""))
        .stdout(contains("\"state\":\"failed\""));
    let run_id = parse_created_id(&send.get_output().stdout, "yaku grpc send");

    cli_cmd(data_dir)
        .args(["run", "events", &run_id])
        .assert()
        .success()
        .stdout(contains("\"kind\":\"request_headers\""))
        .stdout(contains("\"service\":\"example.PatchedService\""))
        .stdout(contains("\"kind\":\"request_body\""))
        .stdout(contains("patched"))
        .stdout(contains("\"kind\":\"error\""));
}

#[test]
fn yaku_grpc_request_records_reflection_services_from_local_server() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();
    let reflection_server = TestReflectionServer::spawn();

    let create_workspace = cli_cmd(data_dir)
        .args(["workspace", "create", "--name", "gRPC Reflection"])
        .assert()
        .success();
    let workspace_id =
        parse_created_id(&create_workspace.get_output().stdout, "yaku workspace create");

    let create_request = cli_cmd(data_dir)
        .args([
            "request",
            "create-grpc",
            &workspace_id,
            "--name",
            "Reflect",
            "--url",
            &reflection_server.url(),
            "--service",
            "grpc.reflection.v1.ServerReflection",
            "--method",
            "ServerReflectionInfo",
        ])
        .assert()
        .success()
        .stdout(contains("\"protocol\":\"grpc\""));
    let request_id = parse_created_id(&create_request.get_output().stdout, "yaku grpc create");

    let send = cli_cmd(data_dir)
        .args(["send", &request_id])
        .assert()
        .success()
        .stdout(contains("\"protocol\":\"grpc\""))
        .stdout(contains("\"state\":\"completed\""))
        .stdout(contains("\"statusCode\":0"));
    let run_id = parse_created_id(&send.get_output().stdout, "yaku grpc reflection send");

    cli_cmd(data_dir)
        .args(["run", "events", &run_id])
        .assert()
        .success()
        .stdout(contains("\"kind\":\"message\""))
        .stdout(contains("\"type\":\"reflection_services\""))
        .stdout(contains("grpc.reflection.v1.ServerReflection"))
        .stdout(contains("\"kind\":\"complete\""));
}

#[test]
fn yaku_grpc_request_invokes_unary_with_local_proto_file() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();
    let unary_server = TestUnaryGrpcServer::spawn();
    let proto_path = data_dir.join("ping.proto");
    std::fs::write(
        &proto_path,
        r#"
            syntax = "proto3";
            package example;
            service PingService {
              rpc Ping (PingRequest) returns (PingResponse);
            }
            message PingRequest {
              string name = 1;
            }
            message PingResponse {
              string message = 1;
            }
        "#,
    )
    .expect("write proto");

    let create_workspace =
        cli_cmd(data_dir).args(["workspace", "create", "--name", "gRPC Unary"]).assert().success();
    let workspace_id =
        parse_created_id(&create_workspace.get_output().stdout, "yaku workspace create");

    let create_request = cli_cmd(data_dir)
        .args([
            "request",
            "create-grpc",
            &workspace_id,
            "--name",
            "Ping Unary",
            "--url",
            &unary_server.url(),
            "--service",
            "example.PingService",
            "--method",
            "Ping",
            "--message",
            r#"{"name":"yakumo"}"#,
            "--proto-file",
            proto_path.to_str().expect("proto path utf8"),
            "--no-reflection",
        ])
        .assert()
        .success()
        .stdout(contains("\"protocol\":\"grpc\""));
    let request_id = parse_created_id(&create_request.get_output().stdout, "yaku grpc create");

    let send = cli_cmd(data_dir)
        .args(["send", &request_id])
        .assert()
        .success()
        .stdout(contains("\"protocol\":\"grpc\""))
        .stdout(contains("\"state\":\"completed\""))
        .stdout(contains("\"statusCode\":0"));
    let run_id = parse_created_id(&send.get_output().stdout, "yaku grpc unary send");

    cli_cmd(data_dir)
        .args(["run", "events", &run_id])
        .assert()
        .success()
        .stdout(contains("\"kind\":\"request_body\""))
        .stdout(contains("\"kind\":\"message\""))
        .stdout(contains("\"message\":\"pong yakumo\""))
        .stdout(contains("\"kind\":\"complete\""));
}
