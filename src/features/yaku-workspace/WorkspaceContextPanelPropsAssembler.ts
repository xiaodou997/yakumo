import type { useYakuWorkspaceForms } from "./useYakuWorkspaceForms";
import type { useYakuWorkspaceMutations } from "./useYakuWorkspaceMutations";
import type { useYakuWorkspaceQueries } from "./useYakuWorkspaceQueries";
import type { YakuWorkspaceSearch } from "./types";
import type { WorkspaceContextPanelProps } from "./WorkspaceContextPanelTypes";

type Queries = ReturnType<typeof useYakuWorkspaceQueries>;
type Forms = ReturnType<typeof useYakuWorkspaceForms>;
type Mutations = ReturnType<typeof useYakuWorkspaceMutations>;

export function buildWorkspaceContextPanelProps({
  setSearch,
  queries,
  forms,
  mutations,
}: {
  setSearch: (patch: Partial<YakuWorkspaceSearch>) => void;
  queries: Queries;
  forms: Forms;
  mutations: Mutations;
}): WorkspaceContextPanelProps {
  return {
    workspaces: queries.workspaces,
    environments: queries.environments,
    cookieJars: queries.cookieJars,
    selectedWorkspaceId: queries.selectedWorkspaceId,
    selectedEnvironmentId: queries.selectedEnvironmentId,
    secretAudit: queries.secretAuditQuery.data,
    secretAuditError: queries.secretAuditQuery.error,
    isSecretAuditLoading: queries.secretAuditQuery.isFetching,
    isDeletingSecret: mutations.deleteSecretMutation.isPending,
    isDeletingOrphanSecrets: mutations.deleteOrphanSecretsMutation.isPending,
    workspaceName: forms.workspaceName,
    setWorkspaceName: forms.setWorkspaceName,
    environmentName: forms.environmentName,
    setEnvironmentName: forms.setEnvironmentName,
    environmentVariablesText: forms.environmentVariablesText,
    setEnvironmentVariablesText: forms.setEnvironmentVariablesText,
    cookieJarName: forms.cookieJarName,
    setCookieJarName: forms.setCookieJarName,
    retention: queries.retentionQuery.data,
    gcReport: mutations.gcBodiesMutation.data,
    exportResult: mutations.exportBackupMutation.data ?? undefined,
    importResult: mutations.importBackupMutation.data ?? undefined,
    orphanCleanupResult: mutations.deleteOrphanSecretsMutation.data ?? null,
    isCreatingWorkspace: mutations.createWorkspaceMutation.isPending,
    isCreatingEnvironment: mutations.createEnvironmentMutation.isPending,
    isUpdatingEnvironment: mutations.updateEnvironmentMutation.isPending,
    isDeletingEnvironment: mutations.deleteEnvironmentMutation.isPending,
    isCreatingCookieJar: mutations.createCookieJarMutation.isPending,
    isClearingCookieJar: mutations.clearCookieJarMutation.isPending,
    isDeletingCookie: mutations.deleteCookieMutation.isPending,
    deletingCookieId: mutations.deleteCookieMutation.variables?.cookieId ?? "",
    isDeletingCookieJar: mutations.deleteCookieJarMutation.isPending,
    isSettingRetention: mutations.setRetentionMutation.isPending,
    isClearingRetention: mutations.clearRetentionMutation.isPending,
    isGcBodies: mutations.gcBodiesMutation.isPending,
    isExportingBackup: mutations.exportBackupMutation.isPending,
    isImportingBackup: mutations.importBackupMutation.isPending,
    onCreateWorkspace: () => mutations.createWorkspaceMutation.mutate(),
    onSelectWorkspace: (workspaceId) =>
      setSearch({
        workspaceId,
        folderId: undefined,
        requestId: undefined,
        runId: undefined,
        environmentId: undefined,
      }),
    onSelectEnvironment: (environmentId) => setSearch({ environmentId }),
    onCreateEnvironment: () => mutations.createEnvironmentMutation.mutate(),
    onUpdateEnvironment: () => mutations.updateEnvironmentMutation.mutate(),
    onDeleteEnvironment: () => mutations.deleteEnvironmentMutation.mutate(),
    onDeleteSecret: (secretId) => mutations.deleteSecretMutation.mutate(secretId),
    onDeleteOrphanSecrets: () => mutations.deleteOrphanSecretsMutation.mutate(),
    onSelectSecretRequest: (requestId) =>
      setSearch({
        requestId,
        folderId: undefined,
        runId: undefined,
      }),
    onCreateCookieJar: () => mutations.createCookieJarMutation.mutate(),
    onClearCookieJar: (jarId) => mutations.clearCookieJarMutation.mutate(jarId),
    onDeleteCookie: (jarId, cookieId) =>
      mutations.deleteCookieMutation.mutateAsync({ jarId, cookieId }),
    onDeleteCookieJar: (jarId) => mutations.deleteCookieJarMutation.mutate(jarId),
    onSetRetention: (limit) => mutations.setRetentionMutation.mutate(limit),
    onClearRetention: () => mutations.clearRetentionMutation.mutate(),
    onGcBodies: () => mutations.gcBodiesMutation.mutate(),
    onExportBackup: () => mutations.exportBackupMutation.mutate(),
    onImportBackup: () => mutations.importBackupMutation.mutate(),
  };
}
