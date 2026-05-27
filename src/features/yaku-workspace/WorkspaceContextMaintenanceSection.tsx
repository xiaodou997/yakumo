import { WorkspaceContextBackupCard } from "./WorkspaceContextBackupCard";
import { WorkspaceContextRetentionCard } from "./WorkspaceContextRetentionCard";
import type { WorkspaceContextMaintenanceSectionProps } from "./WorkspaceContextMaintenanceTypes";

export function WorkspaceContextMaintenanceSection({
  selectedWorkspaceId,
  retention,
  gcReport,
  exportResult,
  importResult,
  isSettingRetention,
  isClearingRetention,
  isGcBodies,
  isExportingBackup,
  isImportingBackup,
  onSetRetention,
  onClearRetention,
  onGcBodies,
  onExportBackup,
  onImportBackup,
}: WorkspaceContextMaintenanceSectionProps) {
  return (
    <>
      <WorkspaceContextRetentionCard
        selectedWorkspaceId={selectedWorkspaceId}
        retention={retention}
        gcReport={gcReport}
        isSettingRetention={isSettingRetention}
        isClearingRetention={isClearingRetention}
        isGcBodies={isGcBodies}
        onSetRetention={onSetRetention}
        onClearRetention={onClearRetention}
        onGcBodies={onGcBodies}
      />
      <WorkspaceContextBackupCard
        selectedWorkspaceId={selectedWorkspaceId}
        exportResult={exportResult}
        importResult={importResult}
        isExportingBackup={isExportingBackup}
        isImportingBackup={isImportingBackup}
        onExportBackup={onExportBackup}
        onImportBackup={onImportBackup}
      />
    </>
  );
}
