import type { YakuWorkspaceLeftColumnProps } from "./YakuWorkspaceLeftColumnTypes";
import { buildWorkspaceContextPanelProps } from "./WorkspaceContextPanelPropsAssembler";
import type { WorkspaceTreeItem } from "./types";

export function buildYakuWorkspaceLeftColumnProps({
  setSearch,
  queries,
  forms,
  mutations,
  nav,
  treeActions,
}: YakuWorkspaceLeftColumnProps) {
  const workspaceContextProps = buildWorkspaceContextPanelProps({
    setSearch,
    queries,
    forms,
    mutations,
  });

  const requestBuilderProps = {
    workspaceId: queries.selectedWorkspaceId,
    folderNodes: queries.folderNodes,
    cookieJars: queries.cookieJars,
    draft: forms.requestBuilderDraft,
    isCreatingFolder: mutations.createFolderMutation.isPending,
    isCreatingRequest: mutations.createRequestMutation.isPending,
    onCreateFolder: () => mutations.createFolderMutation.mutate(),
    onCreateRequest: () => mutations.createRequestMutation.mutate(),
  };

  const workspaceTreeProps = {
    workspaceId: queries.selectedWorkspaceId,
    workspaceTree: queries.workspaceTree,
    treeRef: nav.treeRef,
    getContextMenu: treeActions.handleWorkspaceTreeGetContextMenu,
    getEditOptions: treeActions.handleWorkspaceTreeGetEditOptions,
    onActivate: treeActions.handleWorkspaceTreeActivate,
    onReorder: (parentId: string | null, children: WorkspaceTreeItem[]) =>
      mutations.reorderTreeMutation.mutate({ parentId, children }),
  };

  return {
    workspaceContextProps,
    requestBuilderProps,
    workspaceTreeProps,
  };
}
