import { Channel, invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import type { WatchResult } from "@yakumo-internal/tauri";
import { SyncOp } from "./bindings/gen_sync";
import { WatchEvent } from "./bindings/gen_watch";

export * from "./bindings/gen_models";

export async function calculateSync(workspaceId: string) {
  return invoke<SyncOp[]>("cmd_sync_calculate", {
    workspaceId,
  });
}

export async function calculateSyncFsOnly(dir: string) {
  return invoke<SyncOp[]>("cmd_sync_calculate_fs", { dir });
}

export async function applySync(workspaceId: string, syncOps: SyncOp[]) {
  return invoke<void>("cmd_sync_apply", {
    workspaceId,
    syncOps: syncOps,
  });
}

export async function applySyncFromDir(workspaceId: string, syncDir: string, syncOps: SyncOp[]) {
  return invoke<void>("cmd_sync_apply_fs", {
    workspaceId,
    syncDir,
    syncOps: syncOps,
  });
}

export function watchWorkspaceFiles(
  workspaceId: string,
  callback: (e: WatchEvent) => void,
) {
  console.log("Watching workspace files", workspaceId);
  const channel = new Channel<WatchEvent>();
  channel.onmessage = callback;
  const unlistenPromise = invoke<WatchResult>("cmd_sync_watch", {
    workspaceId,
    channel,
  });

  void unlistenPromise.then(({ unlistenEvent }) => {
    addWatchKey(unlistenEvent);
  });

  return () =>
    unlistenPromise
      .then(async ({ unlistenEvent }) => {
        console.log("Unwatching workspace files", workspaceId);
        unlistenToWatcher(unlistenEvent);
      })
      .catch(console.error);
}

function unlistenToWatcher(unlistenEvent: string) {
  void emit(unlistenEvent).then(() => {
    removeWatchKey(unlistenEvent);
  });
}

function getWatchKeys() {
  return sessionStorage.getItem("workspace-file-watchers")?.split(",").filter(Boolean) ?? [];
}

function setWatchKeys(keys: string[]) {
  sessionStorage.setItem("workspace-file-watchers", keys.join(","));
}

function addWatchKey(key: string) {
  const keys = getWatchKeys();
  setWatchKeys([...keys, key]);
}

function removeWatchKey(key: string) {
  const keys = getWatchKeys();
  setWatchKeys(keys.filter((k) => k !== key));
}

// On page load, unlisten to all zombie watchers
const keys = getWatchKeys();
if (keys.length > 0) {
  console.log("Unsubscribing to zombie file watchers", keys);
  keys.forEach(unlistenToWatcher);
}
