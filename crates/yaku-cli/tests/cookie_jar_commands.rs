mod common;

use common::{cli_cmd, seed_cookie_jar, seed_workspace};
use predicates::str::contains;
use tempfile::TempDir;

#[test]
fn cookie_jar_list_outputs_json_array() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let data_dir = temp_dir.path();
    seed_workspace(data_dir, "wk_test");
    seed_cookie_jar(data_dir, "wk_test", "cj_test");

    cli_cmd(data_dir)
        .args(["cookie-jar", "list", "wk_test"])
        .assert()
        .success()
        .stdout(contains("["))
        .stdout(contains(r#""id":"cj_test""#))
        .stdout(contains(r#""name":"Seed Cookie Jar""#));
}
