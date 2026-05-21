import { invokeCmd } from "./tauri";

export type V2Protocol = "http" | "graphql" | "grpc" | "web_socket" | "sse";
export type V2RequestNodeKind = "folder" | "request";
export type V2RunState = "created" | "running" | "completed" | "failed" | "cancelled";
export type V2RunEventKind =
  | "log"
  | "dns"
  | "connect"
  | "tls"
  | "request_snapshot"
  | "request_headers"
  | "request_body"
  | "response_headers"
  | "response_body"
  | "message"
  | "error"
  | "complete";

export interface V2PageResponse<T> {
  items: T[];
  nextCursor: number | null;
}

export interface V2GcReport {
  deleted: number;
  retained: number;
  bytesDeleted: number;
  dryRun: boolean;
}

export interface V2DeleteResponse {
  deleted: boolean;
  bodyGc?: V2GcReport;
}

export interface V2Workspace {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface V2Environment {
  id: string;
  workspaceId: string;
  name: string;
  variables: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface V2RequestNode {
  id: string;
  workspaceId: string;
  parentId: string | null;
  requestId: string | null;
  kind: V2RequestNodeKind;
  name: string;
  sortKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface V2Request {
  id: string;
  workspaceId: string;
  protocol: V2Protocol;
  name: string;
  description: string;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface V2Run {
  id: string;
  workspaceId: string;
  requestId: string;
  protocol: V2Protocol;
  state: V2RunState;
  startedAt: string;
  completedAt: string | null;
  statusCode: number | null;
  error: string | null;
}

export interface V2RunEvent {
  id: number;
  runId: string;
  workspaceId: string;
  sequence: number;
  kind: V2RunEventKind;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface V2RunBody {
  id: string;
  runId: string;
  workspaceId: string;
  eventId: number | null;
  bodyRole: "request" | "response" | "message";
  contentType: string | null;
  byteLength: number;
  storageKind: "inline" | "blob" | "file";
  storageRef: string;
  createdAt: string;
}

export interface V2Setting {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface V2WorkspacePageItem extends V2Workspace {
  cursor: number;
}

export interface V2RequestNodePageItem extends V2RequestNode {
  cursor: number;
}

export interface V2RunPageItem extends V2Run {
  cursor: number;
}

export const V2_RUN_EVENT_KIND_OPTIONS: Array<{
  value: "all" | V2RunEventKind;
  label: string;
}> = [
  { value: "all", label: "All Events" },
  { value: "request_headers", label: "Request Headers" },
  { value: "request_body", label: "Request Body" },
  { value: "response_headers", label: "Response Headers" },
  { value: "response_body", label: "Response Body" },
  { value: "message", label: "Message" },
  { value: "error", label: "Error" },
  { value: "complete", label: "Complete" },
  { value: "connect", label: "Connect" },
  { value: "dns", label: "DNS" },
  { value: "tls", label: "TLS" },
  { value: "request_snapshot", label: "Request Snapshot" },
  { value: "log", label: "Log" },
];

export async function listV2Workspaces(limit = 500) {
  return invokeCmd<V2PageResponse<V2WorkspacePageItem>>("cmd_v2_workspace_list", { limit });
}

export async function getV2Workspace(workspaceId: string) {
  return invokeCmd<V2Workspace | null>("cmd_v2_workspace_get", { workspaceId });
}

export async function createV2Workspace(name: string, description = "") {
  return invokeCmd<V2Workspace>("cmd_v2_workspace_create", { name, description });
}

export async function deleteV2Workspace(workspaceId: string) {
  return invokeCmd<V2DeleteResponse>("cmd_v2_workspace_delete", { workspaceId });
}

export async function listV2Environments(workspaceId: string) {
  return invokeCmd<V2Environment[]>("cmd_v2_environment_list", { workspaceId });
}

export async function getV2Environment(environmentId: string) {
  return invokeCmd<V2Environment | null>("cmd_v2_environment_get", { environmentId });
}

export async function createV2Environment(
  workspaceId: string,
  name: string,
  variables: Record<string, unknown> = {},
) {
  return invokeCmd<V2Environment>("cmd_v2_environment_create", { workspaceId, name, variables });
}

export async function updateV2Environment(
  environmentId: string,
  input: { name?: string; variables?: Record<string, unknown> },
) {
  return invokeCmd<V2Environment>("cmd_v2_environment_update", {
    environmentId,
    name: input.name,
    variables: input.variables,
  });
}

export async function deleteV2Environment(environmentId: string) {
  return invokeCmd<V2DeleteResponse>("cmd_v2_environment_delete", { environmentId });
}

export async function listV2Requests(workspaceId: string, limit = 500) {
  return invokeCmd<V2PageResponse<V2RequestNodePageItem>>("cmd_v2_request_list", {
    workspaceId,
    limit,
  });
}

export async function getV2Request(requestId: string) {
  return invokeCmd<V2Request | null>("cmd_v2_request_get", { requestId });
}

export async function createV2Folder(input: {
  workspaceId: string;
  name: string;
  parentId?: string | null;
  sortKey?: string | null;
}) {
  return invokeCmd<V2RequestNode>("cmd_v2_folder_create", input);
}

export async function updateV2Folder(folderId: string, input: { name?: string }) {
  return invokeCmd<V2RequestNode>("cmd_v2_folder_update", { folderId, name: input.name });
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
  return invokeCmd<V2Request>("cmd_v2_request_create", input);
}

export async function updateV2Request(
  requestId: string,
  input: {
    name?: string;
    description?: string;
    config?: Record<string, unknown>;
  },
) {
  return invokeCmd<V2Request>("cmd_v2_request_update", { requestId, ...input });
}

export async function moveV2RequestNode(input: {
  nodeId: string;
  parentId?: string | null;
  sortKey?: string | null;
}) {
  return invokeCmd<V2RequestNode>("cmd_v2_request_node_move", input);
}

export async function deleteV2RequestNode(nodeId: string) {
  return invokeCmd<V2DeleteResponse>("cmd_v2_request_node_delete", { nodeId });
}

export async function listV2RunsForRequest(requestId: string, limit = 100) {
  return invokeCmd<V2PageResponse<V2RunPageItem>>("cmd_v2_run_list", { requestId, limit });
}

export async function listV2RunsForWorkspace(workspaceId: string, limit = 100) {
  return invokeCmd<V2PageResponse<V2RunPageItem>>("cmd_v2_run_list", { workspaceId, limit });
}

export async function getV2Run(runId: string) {
  return invokeCmd<V2Run | null>("cmd_v2_run_get", { runId });
}

export async function listV2RunEvents(
  runId: string,
  kind: V2RunEventKind | null = null,
  limit = 300,
) {
  return invokeCmd<V2PageResponse<V2RunEvent>>("cmd_v2_run_events", {
    runId,
    kind,
    limit,
  });
}

export async function listV2RunBodies(runId: string) {
  return invokeCmd<V2RunBody[]>("cmd_v2_run_bodies", { runId });
}

export async function getV2RunBodyBytes(bodyId: string) {
  return invokeCmd<number[]>("cmd_v2_run_body_bytes", { bodyId });
}

export async function deleteV2Run(runId: string) {
  return invokeCmd<V2DeleteResponse>("cmd_v2_run_delete", { runId });
}

export async function pruneV2Runs(input: {
  keepLast: number;
  requestId?: string | null;
  workspaceId?: string | null;
}) {
  return invokeCmd<V2GcReport>("cmd_v2_run_prune", input);
}

export async function getV2RunRetention(workspaceId: string) {
  return invokeCmd<number | null>("cmd_v2_run_retention_get", { workspaceId });
}

export async function setV2RunRetention(workspaceId: string, keepLast: number) {
  return invokeCmd<V2Setting>("cmd_v2_run_retention_set", { workspaceId, keepLast });
}

export async function clearV2RunRetention(workspaceId: string) {
  return invokeCmd<V2DeleteResponse>("cmd_v2_run_retention_clear", { workspaceId });
}

export async function gcV2Bodies(dryRun = false) {
  return invokeCmd<V2GcReport>("cmd_v2_gc_bodies", { dryRun });
}

export async function sendV2Request(requestId: string, environmentId?: string | null) {
  return invokeCmd<V2Run>("cmd_v2_send_request", {
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
