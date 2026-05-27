import type {
  YakuBackupImportResponse,
  YakuBackupManifest,
  YakuCookieJar,
  YakuEnvironment,
  YakuGcReport,
  YakuSecretAudit,
  YakuSecretCleanupResponse,
  YakuWorkspace,
} from "../../lib/yaku-client";

export type WorkspaceContextPanelProps = {
  workspaces: YakuWorkspace[];
  environments: YakuEnvironment[];
  cookieJars: YakuCookieJar[];
  selectedWorkspaceId: string | null | undefined;
  selectedEnvironmentId: string | null | undefined;
  secretAudit: YakuSecretAudit | undefined;
  secretAuditError: unknown;
  isSecretAuditLoading: boolean;
  isDeletingSecret: boolean;
  isDeletingOrphanSecrets: boolean;
  workspaceName: string;
  setWorkspaceName: (value: string) => void;
  environmentName: string;
  setEnvironmentName: (value: string) => void;
  environmentVariablesText: string;
  setEnvironmentVariablesText: (value: string) => void;
  cookieJarName: string;
  setCookieJarName: (value: string) => void;
  retention: number | null | undefined;
  gcReport?: YakuGcReport;
  exportResult?: YakuBackupManifest;
  importResult?: YakuBackupImportResponse;
  orphanCleanupResult?: YakuSecretCleanupResponse | null;
  isCreatingWorkspace: boolean;
  isCreatingEnvironment: boolean;
  isUpdatingEnvironment: boolean;
  isDeletingEnvironment: boolean;
  isCreatingCookieJar: boolean;
  isClearingCookieJar: boolean;
  isDeletingCookie: boolean;
  deletingCookieId: string;
  isDeletingCookieJar: boolean;
  isSettingRetention: boolean;
  isClearingRetention: boolean;
  isGcBodies: boolean;
  isExportingBackup: boolean;
  isImportingBackup: boolean;
  onCreateWorkspace: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onSelectEnvironment: (environmentId: string | undefined) => void;
  onCreateEnvironment: () => void;
  onUpdateEnvironment: () => void;
  onDeleteEnvironment: () => void;
  onDeleteSecret: (secretId: string) => void;
  onDeleteOrphanSecrets: () => void;
  onSelectSecretRequest: (requestId: string) => void;
  onCreateCookieJar: () => void;
  onClearCookieJar: (jarId: string) => void;
  onDeleteCookie: (jarId: string, cookieId: string) => Promise<unknown>;
  onDeleteCookieJar: (jarId: string) => void;
  onSetRetention: (limit: number) => void;
  onClearRetention: () => void;
  onGcBodies: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
};
