import type { YakuWorkspaceMainViewProps } from "./YakuWorkspaceMainViewTypes";

export function buildYakuWorkspaceMainViewProps(props: YakuWorkspaceMainViewProps) {
  const heroProps = {
    workspacesCount: props.queries.workspaces.length,
    requestsCount: props.queries.requestNodes.length,
    runsCount: props.queries.runs.length,
    latestState: props.queries.runs[0]?.state ?? "idle",
    canStartRun: props.queries.selectedRequestId != null,
    canCancelRun: props.queries.selectedRunIsRunning,
    isStartingRun: props.mutations.startRunMutation.isPending,
    isCancellingRun: props.mutations.cancelRunMutation.isPending,
    onStartRun: () => props.mutations.startRunMutation.mutate(),
    onCancelRun: () => props.mutations.cancelRunMutation.mutate(),
  };

  const leftColumnProps = {
    setSearch: props.setSearch,
    queries: props.queries,
    forms: props.forms,
    mutations: props.mutations,
    nav: props.nav,
    treeActions: props.treeActions,
  };

  const centerColumnProps = {
    queries: props.queries,
    forms: props.forms,
    mutations: props.mutations,
    selectedRunEventId: props.nav.selectedRunEventId,
    runActions: props.runActions,
  };

  const rightColumnProps = {
    queries: props.queries,
    nav: props.nav,
    runActions: props.runActions,
  };

  const mutationErrorList = [
    props.mutations.createWorkspaceMutation.error,
    props.mutations.createEnvironmentMutation.error,
    props.mutations.updateEnvironmentMutation.error,
    props.mutations.deleteEnvironmentMutation.error,
    props.mutations.createCookieJarMutation.error,
    props.mutations.clearCookieJarMutation.error,
    props.mutations.deleteCookieMutation.error,
    props.mutations.deleteCookieJarMutation.error,
    props.mutations.createFolderMutation.error,
    props.mutations.updateFolderMutation.error,
    props.mutations.createRequestMutation.error,
    props.mutations.updateRequestMutation.error,
    props.mutations.moveNodeMutation.error,
    props.mutations.renameTreeNodeMutation.error,
    props.mutations.reorderTreeMutation.error,
    props.mutations.startTreeRequestMutation.error,
    props.mutations.deleteRequestNodeMutation.error,
    props.mutations.deleteFolderNodeMutation.error,
    props.mutations.deleteTreeNodeMutation.error,
    props.mutations.setRetentionMutation.error,
    props.mutations.clearRetentionMutation.error,
    props.mutations.gcBodiesMutation.error,
    props.mutations.exportBackupMutation.error,
    props.mutations.importBackupMutation.error,
    props.mutations.deleteSecretMutation.error,
    props.mutations.deleteOrphanSecretsMutation.error,
  ];

  return {
    heroProps,
    leftColumnProps,
    centerColumnProps,
    rightColumnProps,
    mutationErrorList,
  };
}
