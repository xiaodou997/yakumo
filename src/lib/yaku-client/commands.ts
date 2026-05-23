import { invokeCmd } from "../tauri";
import type {
  YakuDeleteResponse,
  YakuEnvironment,
  YakuGcReport,
  YakuPageResponse,
  YakuProtocol,
  YakuRequest,
  YakuRequestNode,
  YakuRequestNodePageItem,
  YakuRun,
  YakuRunBody,
  YakuRunEvent,
  YakuRunEventKind,
  YakuRunPageItem,
  YakuSetting,
  YakuWorkspace,
  YakuWorkspacePageItem,
  YakuBackupImportResponse,
  YakuBackupManifest,
  YakuCookieJar,
  YakuCookieRecord,
} from "./types";

export async function listYakuWorkspaces(limit = 500) {
  return invokeCmd<YakuPageResponse<YakuWorkspacePageItem>>("cmd_yaku_workspace_list", { limit });
}

export async function getYakuWorkspace(workspaceId: string) {
  return invokeCmd<YakuWorkspace | null>("cmd_yaku_workspace_get", { workspaceId });
}

export async function createYakuWorkspace(name: string, description = "") {
  return invokeCmd<YakuWorkspace>("cmd_yaku_workspace_create", { name, description });
}

export async function deleteYakuWorkspace(workspaceId: string) {
  return invokeCmd<YakuDeleteResponse>("cmd_yaku_workspace_delete", { workspaceId });
}

export async function listYakuEnvironments(workspaceId: string) {
  return invokeCmd<YakuEnvironment[]>("cmd_yaku_environment_list", { workspaceId });
}

export async function getYakuEnvironment(environmentId: string) {
  return invokeCmd<YakuEnvironment | null>("cmd_yaku_environment_get", { environmentId });
}

export async function createYakuEnvironment(
  workspaceId: string,
  name: string,
  variables: Record<string, unknown> = {},
) {
  return invokeCmd<YakuEnvironment>("cmd_yaku_environment_create", { workspaceId, name, variables });
}

export async function updateYakuEnvironment(
  environmentId: string,
  input: { name?: string; variables?: Record<string, unknown> },
) {
  return invokeCmd<YakuEnvironment>("cmd_yaku_environment_update", {
    environmentId,
    name: input.name,
    variables: input.variables,
  });
}

export async function deleteYakuEnvironment(environmentId: string) {
  return invokeCmd<YakuDeleteResponse>("cmd_yaku_environment_delete", { environmentId });
}

export async function listYakuCookieJars(workspaceId: string) {
  return invokeCmd<YakuCookieJar[]>("cmd_yaku_cookie_jar_list", { workspaceId });
}

export async function createYakuCookieJar(workspaceId: string, name: string) {
  return invokeCmd<YakuCookieJar>("cmd_yaku_cookie_jar_create", { workspaceId, name });
}

export async function deleteYakuCookieJar(jarId: string) {
  return invokeCmd<YakuDeleteResponse>("cmd_yaku_cookie_jar_delete", { jarId });
}

export async function listYakuCookies(jarId: string) {
  return invokeCmd<YakuCookieRecord[]>("cmd_yaku_cookie_list", { jarId });
}

export async function clearYakuCookieJar(jarId: string) {
  return invokeCmd<YakuDeleteResponse>("cmd_yaku_cookie_jar_clear", { jarId });
}

export async function listYakuRequests(workspaceId: string, limit = 500) {
  return invokeCmd<YakuPageResponse<YakuRequestNodePageItem>>("cmd_yaku_request_list", {
    workspaceId,
    limit,
  });
}

export async function getYakuRequest(requestId: string) {
  return invokeCmd<YakuRequest | null>("cmd_yaku_request_get", { requestId });
}

export async function createYakuFolder(input: {
  workspaceId: string;
  name: string;
  parentId?: string | null;
  sortKey?: string | null;
}) {
  return invokeCmd<YakuRequestNode>("cmd_yaku_folder_create", input);
}

export async function updateYakuFolder(folderId: string, input: { name?: string }) {
  return invokeCmd<YakuRequestNode>("cmd_yaku_folder_update", { folderId, name: input.name });
}

export async function createYakuRequest(input: {
  workspaceId: string;
  name: string;
  protocol: YakuProtocol;
  config: Record<string, unknown>;
  parentId?: string | null;
  sortKey?: string | null;
  description?: string | null;
}) {
  return invokeCmd<YakuRequest>("cmd_yaku_request_create", input);
}

export async function updateYakuRequest(
  requestId: string,
  input: {
    name?: string;
    description?: string;
    config?: Record<string, unknown>;
  },
) {
  return invokeCmd<YakuRequest>("cmd_yaku_request_update", { requestId, ...input });
}

export async function moveYakuRequestNode(input: {
  nodeId: string;
  parentId?: string | null;
  sortKey?: string | null;
}) {
  return invokeCmd<YakuRequestNode>("cmd_yaku_request_node_move", input);
}

export async function deleteYakuRequestNode(nodeId: string) {
  return invokeCmd<YakuDeleteResponse>("cmd_yaku_request_node_delete", { nodeId });
}

export async function listYakuRunsForRequest(requestId: string, limit = 100) {
  return invokeCmd<YakuPageResponse<YakuRunPageItem>>("cmd_yaku_run_list", { requestId, limit });
}

export async function listYakuRunsForWorkspace(workspaceId: string, limit = 100) {
  return invokeCmd<YakuPageResponse<YakuRunPageItem>>("cmd_yaku_run_list", { workspaceId, limit });
}

export async function getYakuRun(runId: string) {
  return invokeCmd<YakuRun | null>("cmd_yaku_run_get", { runId });
}

export async function listYakuRunEvents(
  runId: string,
  kind: YakuRunEventKind | null = null,
  limit = 300,
) {
  return invokeCmd<YakuPageResponse<YakuRunEvent>>("cmd_yaku_run_events", {
    runId,
    kind,
    limit,
  });
}

export async function listYakuRunBodies(runId: string) {
  return invokeCmd<YakuRunBody[]>("cmd_yaku_run_bodies", { runId });
}

export async function getYakuRunBodyBytes(bodyId: string) {
  return invokeCmd<number[]>("cmd_yaku_run_body_bytes", { bodyId });
}

export async function startYakuRun(requestId: string, environmentId?: string | null) {
  return invokeCmd<YakuRun>("cmd_yaku_run_start", {
    requestId,
    environmentId: environmentId ?? null,
  });
}

export async function cancelYakuRun(runId: string) {
  return invokeCmd<YakuRun>("cmd_yaku_run_cancel", { runId });
}

export async function deleteYakuRun(runId: string) {
  return invokeCmd<YakuDeleteResponse>("cmd_yaku_run_delete", { runId });
}

export async function pruneYakuRuns(input: {
  keepLast: number;
  requestId?: string | null;
  workspaceId?: string | null;
}) {
  return invokeCmd<YakuGcReport>("cmd_yaku_run_prune", input);
}

export async function getYakuRunRetention(workspaceId: string) {
  return invokeCmd<number | null>("cmd_yaku_run_retention_get", { workspaceId });
}

export async function setYakuRunRetention(workspaceId: string, keepLast: number) {
  return invokeCmd<YakuSetting>("cmd_yaku_run_retention_set", { workspaceId, keepLast });
}

export async function clearYakuRunRetention(workspaceId: string) {
  return invokeCmd<YakuDeleteResponse>("cmd_yaku_run_retention_clear", { workspaceId });
}

export async function getYakuSetting(key: string) {
  return invokeCmd<YakuSetting | null>("cmd_yaku_setting_get", { key });
}

export async function setYakuSetting(key: string, value: unknown) {
  return invokeCmd<YakuSetting>("cmd_yaku_setting_set", { key, value });
}

export async function exportYakuWorkspaceBackup(workspaceId: string, exportPath: string) {
  return invokeCmd<YakuBackupManifest>("cmd_yaku_backup_export", { workspaceId, exportPath });
}

export async function importYakuWorkspaceBackup(filePath: string, replaceExisting = true) {
  return invokeCmd<YakuBackupImportResponse>("cmd_yaku_backup_import", {
    filePath,
    replaceExisting,
  });
}

export async function gcYakuBodies(dryRun = false) {
  return invokeCmd<YakuGcReport>("cmd_yaku_gc_bodies", { dryRun });
}

export async function sendYakuRequest(requestId: string, environmentId?: string | null) {
  return invokeCmd<YakuRun>("cmd_yaku_send_request", {
    requestId,
    environmentId: environmentId ?? null,
  });
}

export function decodeYakuBody(bytes: number[]) {
  return new TextDecoder().decode(Uint8Array.from(bytes));
}

export function formatJsonIfPossible(input: string) {
  try {
    return JSON.stringify(JSON.parse(input), null, 2);
  } catch {
    return input;
  }
}
