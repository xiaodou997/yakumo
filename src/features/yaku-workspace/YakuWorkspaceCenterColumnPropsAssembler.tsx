import { NodeMoveControls } from "./NodeMoveControls";
import type { YakuWorkspaceCenterColumnProps } from "./YakuWorkspaceCenterColumnTypes";

export function buildCenterColumnPanelProps({
  queries,
  forms,
  mutations,
  selectedRunEventId,
  runActions,
}: YakuWorkspaceCenterColumnProps) {
  const folderSnapshotProps = {
    folderNode: queries.selectedFolderNode,
    editName: forms.folderEditName,
    setEditName: forms.setFolderEditName,
    moveControls:
      queries.selectedFolderNode == null ? null : (
        <NodeMoveControls
          label="Move Folder"
          nodeId={queries.selectedFolderNode.id}
          currentParentId={queries.selectedFolderNode.parentId}
          currentFolderId={queries.selectedFolderNode.id}
          folderNodes={queries.folderNodes}
          value={forms.folderMoveParentId}
          setValue={forms.setFolderMoveParentId}
          isLoading={mutations.moveNodeMutation.isPending}
          onMove={(parentId) =>
            mutations.moveNodeMutation.mutate({
              nodeId: queries.selectedFolderNode!.id,
              parentId,
            })
          }
        />
      ),
    isSaving: mutations.updateFolderMutation.isPending,
    isDeleting: mutations.deleteFolderNodeMutation.isPending,
    onSave: () => mutations.updateFolderMutation.mutate(),
    onUseAsParent: () => {
      if (queries.selectedFolderNode != null) {
        forms.requestBuilderDraft.setParentId(queries.selectedFolderNode.id);
      }
    },
    onDelete: () => mutations.deleteFolderNodeMutation.mutate(),
  };

  const requestSnapshotProps = {
    request: queries.requestQuery.data,
    error: queries.requestQuery.error,
    draft: forms.requestEditDraft,
    cookieJars: queries.cookieJars,
    moveControls: (
      <NodeMoveControls
        label="Move Request"
        nodeId={queries.selectedRequestNode?.id ?? ""}
        currentParentId={queries.selectedRequestNode?.parentId}
        currentFolderId={queries.selectedRequestNode?.id}
        folderNodes={queries.folderNodes}
        value={forms.requestMoveParentId}
        setValue={forms.setRequestMoveParentId}
        isLoading={mutations.moveNodeMutation.isPending}
        onMove={(parentId) =>
          mutations.moveNodeMutation.mutate({
            nodeId: queries.selectedRequestNode!.id,
            parentId,
          })
        }
      />
    ),
    isSaving: mutations.updateRequestMutation.isPending,
    isDeleting: mutations.deleteRequestNodeMutation.isPending,
    canDelete: queries.selectedRequestNode != null,
    onSaveStructured: () => mutations.updateRequestMutation.mutate("structured"),
    onSaveRaw: () => mutations.updateRequestMutation.mutate("raw"),
    onDelete: () => mutations.deleteRequestNodeMutation.mutate(),
  };

  const runHistoryProps = {
    runs: queries.runs,
    selectedRunId: queries.selectedRunId ?? "",
    selectedEventId: selectedRunEventId,
    error: queries.runsQuery.error,
    onSelectRun: runActions.handleSelectRun,
    onOpenEvent: runActions.handleOpenEvent,
    onOpenRunEvent: runActions.handleOpenRunEvent,
    onClearEventFocus: runActions.handleClearEventFocus,
  };

  return {
    folderSnapshotProps,
    requestSnapshotProps,
    runHistoryProps,
  };
}
