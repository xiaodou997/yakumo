import type {
  BodyRole as DomainBodyRole,
  BodyStorageKind as DomainBodyStorageKind,
  CookieJar as DomainCookieJar,
  CookieRecord as DomainCookieRecord,
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
  SecretMetadata as DomainSecretMetadata,
  Setting as DomainSetting,
  Workspace as DomainWorkspace,
} from "../../../crates/yaku-domain/bindings/gen_domain";

export type YakuProtocol = DomainProtocol;
export type YakuRequestNodeKind = DomainRequestNodeKind;
export type YakuRunState = DomainRunState;
export type YakuRunEventKind = DomainRunEventKind;
export type YakuBodyRole = DomainBodyRole;
export type YakuBodyStorageKind = DomainBodyStorageKind;

export interface YakuPageResponse<T> {
  items: T[];
  nextCursor: number | null;
}

export interface YakuGcReport {
  deleted: number;
  retained: number;
  bytesDeleted: number;
  dryRun: boolean;
}

export interface YakuDeleteResponse {
  deleted: boolean;
  bodyGc?: YakuGcReport;
}

export type YakuWorkspace = DomainWorkspace;
export type YakuCookieJar = DomainCookieJar;
export type YakuCookieRecord = DomainCookieRecord;
export type YakuEnvironment = DomainEnvironment;
export type YakuSecretMetadata = DomainSecretMetadata;
export type YakuRequestNode = DomainRequestNode;
export type YakuRequest = DomainRequest;
export type YakuRun = DomainRun;
export type YakuRunEvent = Omit<DomainRunEvent, "id" | "sequence" | "data"> & {
  id: number;
  sequence: number;
  data: Record<string, unknown>;
};
export type YakuRunBody = Omit<DomainRunBody, "eventId" | "byteLength"> & {
  eventId: number | null;
  byteLength: number;
};
export type YakuSetting = DomainSetting;
export type YakuWorkspacePageItem = YakuWorkspace & { cursor: number };
export type YakuRequestNodePageItem = YakuRequestNode & { cursor: number };
export type YakuRunPageItem = YakuRun & { cursor: number };

export interface YakuBackupManifest {
  id: string;
  workspaceId: string | null;
  contentHash: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface YakuBackupImportResponse {
  workspace: YakuWorkspace;
  manifest: YakuBackupManifest;
  replacedExisting: boolean;
}

export interface YakuSecretAuditReference {
  requestId: string;
  requestName: string;
  nodeId: string;
  nodePath: string;
  authType: string;
  authField: string;
}

export interface YakuSecretAuditItem {
  secret: YakuSecretMetadata;
  kind: string | null;
  storage: string | null;
  orphan: boolean;
  references: YakuSecretAuditReference[];
}

export interface YakuSecretAudit {
  items: YakuSecretAuditItem[];
  orphanCount: number;
  referencedCount: number;
}

export interface YakuSecretCleanupResponse {
  deletedIds: string[];
  deletedCount: number;
}

export interface YakuGrpcMethodDefinition {
  name: string;
  schema: string;
  clientStreaming: boolean;
  serverStreaming: boolean;
}

export interface YakuGrpcServiceDefinition {
  name: string;
  methods: YakuGrpcMethodDefinition[];
}

export type YakuEditorKeymap = "default" | "vim" | "vscode" | "emacs";

export type YakuProxySetting =
  | {
      type: "enabled";
      http: string;
      https: string;
      auth: { user: string; password: string } | null;
      bypass: string;
      disabled?: boolean;
    }
  | { type: "disabled" };

export interface YakuClientCertificate {
  host: string;
  port: number | null;
  crtFile: string | null;
  keyFile: string | null;
  pfxFile: string | null;
  passphrase: string | null;
  enabled?: boolean;
}

export interface YakuAppSettings {
  appearance: string;
  autoupdate: boolean;
  autoDownloadUpdates: boolean;
  checkNotifications: boolean;
  clientCertificates: YakuClientCertificate[];
  coloredMethods: boolean;
  editorFont: string | null;
  editorFontSize: number;
  editorKeymap: YakuEditorKeymap;
  editorSoftWrap: boolean;
  hideWindowControls: boolean;
  hotkeys: Record<string, string[]>;
  interfaceFont: string | null;
  interfaceFontSize: number;
  interfaceScale: number;
  language: string;
  openWorkspaceNewWindow: boolean | null;
  proxy: YakuProxySetting | null;
  themeDark: string;
  themeLight: string;
  updateChannel: string;
  useNativeTitlebar: boolean;
}

export type YakuRunLifecycleKind =
  | "started"
  | "finished"
  | "failed"
  | "cancelled";

export interface YakuRunLifecycleEvent {
  kind: YakuRunLifecycleKind;
  runId: string;
  requestId: string;
  workspaceId: string;
  run: YakuRun | null;
  error: string | null;
}

export const YAKU_RUN_EVENT_KIND_OPTIONS: Array<{
  value: "all" | YakuRunEventKind;
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

export type { DomainPage as YakuDomainPage };
