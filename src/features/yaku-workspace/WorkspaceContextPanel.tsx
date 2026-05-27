import { WorkspaceCookieJarSection } from "./WorkspaceCookieJarSection";
import { WorkspaceSecretAuditSection } from "./WorkspaceSecretAuditSection";
import { WorkspaceContextMaintenanceSection } from "./WorkspaceContextMaintenanceSection";
import { WorkspaceContextWorkspaceSection } from "./WorkspaceContextWorkspaceSection";
import type { WorkspaceContextPanelProps } from "./WorkspaceContextPanelTypes";
import { WorkspacePanel } from "./WorkspacePanels";

export function WorkspaceContextPanel({
  workspaces,
  environments,
  cookieJars,
  selectedWorkspaceId,
  selectedEnvironmentId,
  secretAudit,
  secretAuditError,
  isSecretAuditLoading,
  isDeletingSecret,
  isDeletingOrphanSecrets,
  workspaceName,
  setWorkspaceName,
  environmentName,
  setEnvironmentName,
  environmentVariablesText,
  setEnvironmentVariablesText,
  cookieJarName,
  setCookieJarName,
  retention,
  gcReport,
  exportResult,
  importResult,
  orphanCleanupResult,
  isCreatingWorkspace,
  isCreatingEnvironment,
  isUpdatingEnvironment,
  isDeletingEnvironment,
  isCreatingCookieJar,
  isClearingCookieJar,
  isDeletingCookie,
  deletingCookieId,
  isDeletingCookieJar,
  isSettingRetention,
  isClearingRetention,
  isGcBodies,
  isExportingBackup,
  isImportingBackup,
  onCreateWorkspace,
  onSelectWorkspace,
  onSelectEnvironment,
  onCreateEnvironment,
  onUpdateEnvironment,
  onDeleteEnvironment,
  onDeleteSecret,
  onDeleteOrphanSecrets,
  onSelectSecretRequest,
  onCreateCookieJar,
  onClearCookieJar,
  onDeleteCookie,
  onDeleteCookieJar,
  onSetRetention,
  onClearRetention,
  onGcBodies,
  onExportBackup,
  onImportBackup,
}: WorkspaceContextPanelProps) {
  const selectedEnvironment = environments.find((environment) => environment.id === selectedEnvironmentId);

  return (
    <WorkspacePanel title="Workspace Context" subtitle="Choose the Yaku workspace and environment.">
      <WorkspaceContextWorkspaceSection
        workspaces={workspaces}
        environments={environments}
        selectedWorkspaceId={selectedWorkspaceId}
        selectedEnvironmentId={selectedEnvironmentId}
        selectedEnvironmentVariables={selectedEnvironment?.variables ?? {}}
        workspaceName={workspaceName}
        setWorkspaceName={setWorkspaceName}
        environmentName={environmentName}
        setEnvironmentName={setEnvironmentName}
        environmentVariablesText={environmentVariablesText}
        setEnvironmentVariablesText={setEnvironmentVariablesText}
        isCreatingWorkspace={isCreatingWorkspace}
        isCreatingEnvironment={isCreatingEnvironment}
        isUpdatingEnvironment={isUpdatingEnvironment}
        isDeletingEnvironment={isDeletingEnvironment}
        onCreateWorkspace={onCreateWorkspace}
        onSelectWorkspace={onSelectWorkspace}
        onSelectEnvironment={onSelectEnvironment}
        onCreateEnvironment={onCreateEnvironment}
        onUpdateEnvironment={onUpdateEnvironment}
        onDeleteEnvironment={onDeleteEnvironment}
      />

      <WorkspaceSecretAuditSection
        selectedWorkspaceId={selectedWorkspaceId}
        secretAudit={secretAudit}
        secretAuditError={secretAuditError}
        isSecretAuditLoading={isSecretAuditLoading}
        isDeletingSecret={isDeletingSecret}
        isDeletingOrphanSecrets={isDeletingOrphanSecrets}
        orphanCleanupResult={orphanCleanupResult}
        onDeleteSecret={onDeleteSecret}
        onDeleteOrphanSecrets={onDeleteOrphanSecrets}
        onSelectSecretRequest={onSelectSecretRequest}
      />

      <WorkspaceCookieJarSection
        selectedWorkspaceId={selectedWorkspaceId}
        cookieJars={cookieJars}
        cookieJarName={cookieJarName}
        setCookieJarName={setCookieJarName}
        isCreatingCookieJar={isCreatingCookieJar}
        isClearingCookieJar={isClearingCookieJar}
        isDeletingCookie={isDeletingCookie}
        deletingCookieId={deletingCookieId}
        isDeletingCookieJar={isDeletingCookieJar}
        onCreateCookieJar={onCreateCookieJar}
        onClearCookieJar={onClearCookieJar}
        onDeleteCookie={onDeleteCookie}
        onDeleteCookieJar={onDeleteCookieJar}
      />

      <WorkspaceContextMaintenanceSection
        selectedWorkspaceId={selectedWorkspaceId}
        retention={retention}
        gcReport={gcReport}
        exportResult={exportResult}
        importResult={importResult}
        isSettingRetention={isSettingRetention}
        isClearingRetention={isClearingRetention}
        isGcBodies={isGcBodies}
        isExportingBackup={isExportingBackup}
        isImportingBackup={isImportingBackup}
        onSetRetention={onSetRetention}
        onClearRetention={onClearRetention}
        onGcBodies={onGcBodies}
        onExportBackup={onExportBackup}
        onImportBackup={onImportBackup}
      />
    </WorkspacePanel>
  );
}
