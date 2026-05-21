import type {
  BodyRole as DomainBodyRole,
  BodyStorageKind as DomainBodyStorageKind,
  Environment as DomainEnvironment,
  Page as DomainPage,
  Protocol as DomainProtocol,
  Request as DomainRequest,
  RequestNode as DomainRequestNode,
  RequestNodeKind as DomainRequestNodeKind,
  Run as DomainRun,
  RunBody as DomainRunBody,
  RunEvent as DomainRunEvent,
  RunEventKind as DomainRunEventKind,
  RunState as DomainRunState,
  Setting as DomainSetting,
  Workspace as DomainWorkspace,
} from "../../../crates/yaku-domain/bindings/gen_domain";

export type V2Protocol = DomainProtocol;
export type V2RequestNodeKind = DomainRequestNodeKind;
export type V2RunState = DomainRunState;
export type V2RunEventKind = DomainRunEventKind;
export type V2BodyRole = DomainBodyRole;
export type V2BodyStorageKind = DomainBodyStorageKind;

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

export type V2Workspace = DomainWorkspace;
export type V2Environment = DomainEnvironment;
export type V2RequestNode = DomainRequestNode;
export type V2Request = DomainRequest;
export type V2Run = DomainRun;
export type V2RunEvent = Omit<DomainRunEvent, "id" | "sequence" | "data"> & {
  id: number;
  sequence: number;
  data: Record<string, unknown>;
};
export type V2RunBody = Omit<DomainRunBody, "eventId" | "byteLength"> & {
  eventId: number | null;
  byteLength: number;
};
export type V2Setting = DomainSetting;
export type V2WorkspacePageItem = V2Workspace & { cursor: number };
export type V2RequestNodePageItem = V2RequestNode & { cursor: number };
export type V2RunPageItem = V2Run & { cursor: number };

export type YakuRunLifecycleKind = "started" | "finished" | "failed" | "cancelled";

export interface YakuRunLifecycleEvent {
  kind: YakuRunLifecycleKind;
  runId: string;
  requestId: string;
  workspaceId: string;
  run: V2Run | null;
  error: string | null;
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

export type { DomainPage as V2DomainPage };
