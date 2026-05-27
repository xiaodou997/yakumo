import { useEffect } from "react";
import { useYakuWorkspaceForms } from "./useYakuWorkspaceForms";
import {
  useYakuWorkspaceLocalState,
  useYakuWorkspaceNavigationEffects,
} from "./useYakuWorkspaceNavigationState";
import { useYakuWorkspaceMutations } from "./useYakuWorkspaceMutations";
import { useYakuWorkspaceQueries } from "./useYakuWorkspaceQueries";
import { useYakuWorkspaceRunPanelActions } from "./useYakuWorkspaceRunPanelActions";
import { useYakuWorkspaceTreeActions } from "./useYakuWorkspaceTreeActions";
import type { YakuWorkspaceSearch } from "./types";

export function useYakuWorkspaceShellState({
  search,
  setSearch,
}: {
  search: YakuWorkspaceSearch;
  setSearch: (patch: Partial<YakuWorkspaceSearch>) => void;
}) {
  const nav = useYakuWorkspaceLocalState();
  const queries = useYakuWorkspaceQueries({
    search,
    eventKind: nav.eventKind,
    selectedBodyId: nav.selectedBodyId,
  });
  const forms = useYakuWorkspaceForms({
    selectedEnvironment: queries.selectedEnvironment,
    selectedFolderNode: queries.selectedFolderNode,
    selectedRequestNode: queries.selectedRequestNode,
    loadedRequest: queries.requestQuery.data,
  });
  const mutations = useYakuWorkspaceMutations({
    selectedWorkspaceId: queries.selectedWorkspaceId,
    selectedWorkspace: queries.selectedWorkspace,
    selectedEnvironmentId: queries.selectedEnvironmentId,
    selectedRequestId: queries.selectedRequestId,
    selectedRunId: queries.selectedRunId,
    selectedFolderNode: queries.selectedFolderNode,
    selectedRequestNode: queries.selectedRequestNode,
    loadedRequest: queries.requestQuery.data,
    workspaceName: forms.workspaceName,
    environmentName: forms.environmentName,
    environmentVariablesText: forms.environmentVariablesText,
    cookieJarName: forms.cookieJarName,
    folderName: forms.folderName,
    folderEditName: forms.folderEditName,
    requestBuilderDraft: forms.requestBuilderDraft,
    requestEditDraft: forms.requestEditDraft,
    setSearch,
  });

  useYakuWorkspaceNavigationEffects({
    search,
    setSearch,
    workspacesReady: queries.workspacesQuery.isSuccess,
    selectedWorkspaceId: queries.selectedWorkspaceId,
    environmentsReady: queries.environmentsQuery.isSuccess,
    selectedEnvironmentId: queries.selectedEnvironmentId,
    requestsReady: queries.requestsQuery.isSuccess,
    selectedRequestId: queries.selectedRequestId,
    selectedFolderNode: queries.selectedFolderNode,
    selectedRequestNode: queries.selectedRequestNode,
    runsReady: queries.runsQuery.isSuccess,
    selectedRunId: queries.selectedRunId,
    runBodies: queries.runBodies,
    setSelectedBodyId: nav.setSelectedBodyId,
    setSelectedRunEventId: nav.setSelectedRunEventId,
    setEventFocusContextLabel: nav.setEventFocusContextLabel,
    treeRef: nav.treeRef,
    invalidateRunData: mutations.invalidateRunData,
  });

  useEffect(() => {
    mutations.deleteSecretMutation.reset();
    mutations.deleteOrphanSecretsMutation.reset();
  }, [
    mutations.deleteOrphanSecretsMutation,
    mutations.deleteSecretMutation,
    queries.selectedWorkspaceId,
  ]);

  const treeActions = useYakuWorkspaceTreeActions({
    treeRef: nav.treeRef,
    setSearch,
    requestBuilderSetParentId: forms.requestBuilderDraft.setParentId,
    renameTreeNode: (args) => mutations.renameTreeNodeMutation.mutateAsync(args),
    deleteTreeNode: (item) => mutations.deleteTreeNodeMutation.mutate(item),
    startTreeRequest: (item) => mutations.startTreeRequestMutation.mutate(item),
  });

  const runActions = useYakuWorkspaceRunPanelActions({
    setSearch,
    setEventKind: nav.setEventKind,
    setSelectedRunEventId: nav.setSelectedRunEventId,
    setEventFocusContextLabel: nav.setEventFocusContextLabel,
  });

  return {
    nav,
    queries,
    forms,
    mutations,
    treeActions,
    runActions,
  };
}
