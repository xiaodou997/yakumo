#![allow(dead_code)]

pub mod grpc_server;
pub mod http_server;
pub mod websocket_server;

use assert_cmd::Command;
use assert_cmd::cargo::cargo_bin_cmd;
use std::path::Path;

pub fn cli_cmd(data_dir: &Path) -> Command {
    let mut cmd = cargo_bin_cmd!("yaku");
    cmd.arg("--data-dir").arg(data_dir);
    cmd
}

pub fn parse_created_id(stdout: &[u8], label: &str) -> String {
    let value: serde_json::Value = serde_json::from_slice(stdout)
        .unwrap_or_else(|_| panic!("Expected JSON object in '{label}' output"));
    value
        .get("id")
        .and_then(serde_json::Value::as_str)
        .map(str::to_string)
        .unwrap_or_else(|| panic!("Expected id in '{label}' output"))
}
