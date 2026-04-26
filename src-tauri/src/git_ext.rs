//! Tauri-specific extensions for yakumo-git.
//!
//! This module provides the Tauri commands for git functionality.

use crate::error::Error::GenericError;
use crate::error::Result;
use crate::models_ext::QueryManagerExt;
use crate::path_guard;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Runtime, command};
use yakumo_git::{
    BranchDeleteResult, CloneResult, GitCommit, GitRemote, GitStatusSummary, PullResult,
    PushResult, git_add, git_add_credential, git_add_remote, git_checkout_branch, git_clone,
    git_commit, git_create_branch, git_delete_branch, git_delete_remote_branch, git_fetch_all,
    git_init, git_log, git_merge_branch, git_pull, git_pull_force_reset, git_pull_merge, git_push,
    git_remotes, git_rename_branch, git_reset_changes, git_rm_remote, git_status, git_unstage,
};

// NOTE: All of these commands are async to prevent blocking work from locking up the UI

#[command]
pub async fn cmd_git_workspace_checkout<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
    branch: &str,
    force: bool,
) -> Result<String> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_checkout_branch(&dir, branch, force).await?)
}

#[command]
pub async fn cmd_git_workspace_branch<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
    branch: &str,
    base: Option<&str>,
) -> Result<()> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_create_branch(&dir, branch, base).await?)
}

#[command]
pub async fn cmd_git_workspace_delete_branch<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
    branch: &str,
    force: Option<bool>,
) -> Result<BranchDeleteResult> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_delete_branch(&dir, branch, force.unwrap_or(false)).await?)
}

#[command]
pub async fn cmd_git_workspace_delete_remote_branch<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
    branch: &str,
) -> Result<()> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_delete_remote_branch(&dir, branch).await?)
}

#[command]
pub async fn cmd_git_workspace_merge_branch<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
    branch: &str,
) -> Result<()> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_merge_branch(&dir, branch).await?)
}

#[command]
pub async fn cmd_git_workspace_rename_branch<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
    old_name: &str,
    new_name: &str,
) -> Result<()> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_rename_branch(&dir, old_name, new_name).await?)
}

#[command]
pub async fn cmd_git_workspace_status<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
) -> Result<GitStatusSummary> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_status(&dir)?)
}

#[command]
pub async fn cmd_git_workspace_log<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
) -> Result<Vec<GitCommit>> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_log(&dir)?)
}

#[command]
pub async fn cmd_git_workspace_initialize<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
) -> Result<()> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_init(&dir)?)
}

#[command]
pub async fn cmd_git_clone(url: &str, dir: &Path) -> Result<CloneResult> {
    path_guard::writable_parent(dir, "Git clone target")?;
    Ok(git_clone(url, dir).await?)
}

#[command]
pub async fn cmd_git_workspace_commit<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
    message: &str,
) -> Result<()> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_commit(&dir, message).await?)
}

#[command]
pub async fn cmd_git_workspace_fetch_all<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
) -> Result<()> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_fetch_all(&dir).await?)
}

#[command]
pub async fn cmd_git_workspace_push<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
) -> Result<PushResult> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_push(&dir).await?)
}

#[command]
pub async fn cmd_git_workspace_pull<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
) -> Result<PullResult> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_pull(&dir).await?)
}

#[command]
pub async fn cmd_git_workspace_pull_force_reset<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
    remote: &str,
    branch: &str,
) -> Result<PullResult> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_pull_force_reset(&dir, remote, branch).await?)
}

#[command]
pub async fn cmd_git_workspace_pull_merge<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
    remote: &str,
    branch: &str,
) -> Result<PullResult> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_pull_merge(&dir, remote, branch).await?)
}

#[command]
pub async fn cmd_git_workspace_add<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
    rela_paths: Vec<PathBuf>,
) -> Result<()> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    for path in rela_paths {
        path_guard::safe_relative_path(&path, "Git add path")?;
        git_add(&dir, &path)?;
    }
    Ok(())
}

#[command]
pub async fn cmd_git_workspace_unstage<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
    rela_paths: Vec<PathBuf>,
) -> Result<()> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    for path in rela_paths {
        path_guard::safe_relative_path(&path, "Git unstage path")?;
        git_unstage(&dir, &path)?;
    }
    Ok(())
}

#[command]
pub async fn cmd_git_workspace_reset_changes<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
) -> Result<()> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_reset_changes(&dir).await?)
}

#[command]
pub async fn cmd_git_add_credential(
    remote_url: &str,
    username: &str,
    password: &str,
) -> Result<()> {
    Ok(git_add_credential(remote_url, username, password).await?)
}

#[command]
pub async fn cmd_git_workspace_remotes<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
) -> Result<Vec<GitRemote>> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_remotes(&dir)?)
}

#[command]
pub async fn cmd_git_workspace_add_remote<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
    name: &str,
    url: &str,
) -> Result<GitRemote> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_add_remote(&dir, name, url)?)
}

#[command]
pub async fn cmd_git_workspace_rm_remote<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: &str,
    name: &str,
) -> Result<()> {
    let dir = workspace_git_dir(&app_handle, workspace_id)?;
    Ok(git_rm_remote(&dir, name)?)
}

fn workspace_git_dir<R: Runtime>(app_handle: &AppHandle<R>, workspace_id: &str) -> Result<PathBuf> {
    let db = app_handle.db();
    let workspace = db.get_workspace(workspace_id)?;
    let workspace_meta = db.get_or_create_workspace_meta(&workspace.id)?;
    let dir = workspace_meta.setting_sync_dir.ok_or_else(|| {
        GenericError(format!("Workspace {workspace_id} does not have a sync directory configured"))
    })?;
    let dir = PathBuf::from(dir);
    path_guard::existing_dir(&dir, "Git directory")?;
    Ok(dir)
}
