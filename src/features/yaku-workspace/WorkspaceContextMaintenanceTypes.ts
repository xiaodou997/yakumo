import type {
  YakuBackupImportResponse,
  YakuBackupManifest,
  YakuGcReport,
} from "../../lib/yaku-client";

export type WorkspaceContextMaintenanceSectionProps = {
  selectedWorkspaceId: string | null | undefined;
  retention: number | null | undefined;
  gcReport?: YakuGcReport;
  exportResult?: YakuBackupManifest;
  importResult?: YakuBackupImportResponse;
  isSettingRetention: boolean;
  isClearingRetention: boolean;
  isGcBodies: boolean;
  isExportingBackup: boolean;
  isImportingBackup: boolean;
  onSetRetention: (limit: number) => void;
  onClearRetention: () => void;
  onGcBodies: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
};
