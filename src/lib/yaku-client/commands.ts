import { invokeCmd } from "../tauri";
import type {
  V2DeleteResponse,
  V2Environment,
  V2GcReport,
  V2PageResponse,
  V2Protocol,
  V2Request,
  V2RequestNode,
  V2RequestNodePageItem,
  V2Run,
  V2RunBody,
  V2RunEvent,
  V2RunEventKind,
  V2RunPageItem,
  V2Setting,
  V2Workspace,
  V2WorkspacePageItem,
} from "./types";

export async function listV2Workspaces(limit = 500) {
  return invokeCmd<V2PageResponse<V2WorkspacePageItem>>("cmd_yaku_workspace_list", { limit });
}

export async function getV2Workspace(workspaceId: string) {
  return invokeCmd<V2Workspace | null>("cmd_yaku_workspace_get", { workspaceId });
}

export async function createV2Workspace(name: string, description = "") {
  return invokeCmd<V2Workspace>("cmd_yaku_workspace_create", { name, description });
}

export async function deleteV2Workspace(workspaceId: string) {
  return invokeCmd<V2DeleteResponse>("cmd_yaku_workspace_delete", { workspaceId });
}

export async function listV2Environments(workspaceId: string) {
  return invokeCmd<V2Environment[]>("cmd_yaku_environment_list", { workspaceId });
}

export async function getV2Environment(environmentId: string) {
  return invokeCmd<V2Environment | null>("cmd_yaku_environment_get", { environmentId });
}

export async function createV2Environment(
  workspaceId: string,
  name: string,
  variables: Record<string, unknown> = {},
) {
  return invokeCmd<V2Environment>("cmd_yaku_environment_create", { workspaceId, name, variables });
}

export async function updateV2Environment(
  environmentId: string,
  input: { name?: string; variables?: Record<string, unknown> },
) {
  return invokeCmd<V2Environment>("cmd_yaku_environment_update", {
    environmentId,
    name: input.name,
    variables: input.variables,
  });
}

export async function deleteV2Environment(environmentId: string) {
  return invokeCmd<V2DeleteResponse>("cmd_yaku_environment_delete", { environmentId });
}

export async function listV2Requests(workspaceId: string, limit = 500) {
  return invokeCmd<V2PageResponse<V2RequestNodePageItem>>("cmd_yaku_request_list", {
    workspaceId,
    limit,
  });
}

export async function getV2Request(requestId: string) {
  return invokeCmd<V2Request | null>("cmd_yaku_request_get", { requestId });
}

export async function createV2Folder(input: {
  workspaceId: string;
  name: string;
  parentId?: string | null;
  sortKey?: string | null;
}) {
  return invokeCmd<V2RequestNode>("cmd_yaku_folder_create", input);
}

export async function updateV2Folder(folderId: string, input: { name?: string }) {
  return invokeCmd<V2RequestNode>("cmd_yaku_folder_update", { folderId, name: input.name });
}

export async function createV2Request(input: {
  workspaceId: string;
  name: string;
  protocol: V2Protocol;
  config: Record<string, unknown>;
  parentId?: string | null;
  sortKey?: string | null;
  description?: string | null;
}) {
  return invokeCmd<V2Request>("cmd_yaku_request_create", input);
}

export async function updateV2Request(
  requestId: string,
  input: {
    name?: string;
    description?: string;
    config?: Record<string, unknown>;
  },
) {
  return invokeCmd<V2Request>("cmd_yaku_request_update", { requestId, ...input });
}

export async function moveV2RequestNode(input: {
  nodeId: string;
  parentId?: string | null;
  sortKey?: string | null;
}) {
  return invokeCmd<V2RequestNode>("cmd_yaku_request_node_move", input);
}

export async function deleteV2RequestNode(nodeId: string) {
  return invokeCmd<V2DeleteResponse>("cmd_yaku_request_node_delete", { nodeId });
}

export async function listV2RunsForRequest(requestId: string, limit = 100) {
  return invokeCmd<V2PageResponse<V2RunPageItem>>("cmd_yaku_run_list", { requestId, limit });
}

export async function listV2RunsForWorkspace(workspaceId: string, limit = 100) {
  return invokeCmd<V2PageResponse<V2RunPageItem>>("cmd_yaku_run_list", { workspaceId, limit });
}

export async function getV2Run(runId: string) {
  return invokeCmd<V2Run | null>("cmd_yaku_run_get", { runId });
}

export async function listV2RunEvents(
  runId: string,
  kind: V2RunEventKind | null = null,
  limit = 300,
) {
  return invokeCmd<V2PageResponse<V2RunEvent>>("cmd_yaku_run_events", {
    runId,
    kind,
    limit,
  });
}

export async function listV2RunBodies(runId: string) {
  return invokeCmd<V2RunBody[]>("cmd_yaku_run_bodies", { runId });
}

export async function getV2RunBodyBytes(bodyId: string) {
  return invokeCmd<number[]>("cmd_yaku_run_body_bytes", { bodyId });
}

export async function startV2Run(requestId: string, environmentId?: string | null) {
  return invokeCmd<V2Run>("cmd_yaku_run_start", {
    requestId,
    environmentId: environmentId ?? null,
  });
}

export async function cancelV2Run(runId: string) {
  return invokeCmd<V2Run>("cmd_yaku_run_cancel", { runId });
}

export async function deleteV2Run(runId: string) {
  return invokeCmd<V2DeleteResponse>("cmd_yaku_run_delete", { runId });
}

export async function pruneV2Runs(input: {
  keepLast: number;
  requestId?: string | null;
  workspaceId?: string | null;
}) {
  return invokeCmd<V2GcReport>("cmd_yaku_run_prune", input);
}

export async function getV2RunRetention(workspaceId: string) {
  return invokeCmd<number | null>("cmd_yaku_run_retention_get", { workspaceId });
}

export async function setV2RunRetention(workspaceId: string, keepLast: number) {
  return invokeCmd<V2Setting>("cmd_yaku_run_retention_set", { workspaceId, keepLast });
}

export async function clearV2RunRetention(workspaceId: string) {
  return invokeCmd<V2DeleteResponse>("cmd_yaku_run_retention_clear", { workspaceId });
}

export async function gcV2Bodies(dryRun = false) {
  return invokeCmd<V2GcReport>("cmd_yaku_gc_bodies", { dryRun });
}

export async function sendV2Request(requestId: string, environmentId?: string | null) {
  return invokeCmd<V2Run>("cmd_yaku_send_request", {
    requestId,
    environmentId: environmentId ?? null,
  });
}

export function decodeV2Body(bytes: number[]) {
  return new TextDecoder().decode(Uint8Array.from(bytes));
}

export function formatJsonIfPossible(input: string) {
  try {
    return JSON.stringify(JSON.parse(input), null, 2);
  } catch {
    return input;
  }
}
