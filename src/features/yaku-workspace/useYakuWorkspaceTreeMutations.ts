import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createYakuFolder,
  deleteYakuRequestNode,
  moveYakuRequestNode,
  updateYakuFolder,
  updateYakuRequest,
} from "../../lib/yaku-client";
import type { YakuWorkspaceResourceMutationParams } from "./useYakuWorkspaceResourceMutationTypes";
import type { WorkspaceTreeItem } from "./types";

export function useYakuWorkspaceTreeMutations({
  selectedWorkspaceId,
  selectedRequestId,
  selectedFolderNode,
  folderName,
  folderEditName,
  requestBuilderDraft,
  setSearch,
}: Pick<
  YakuWorkspaceResourceMutationParams,
  | "selectedWorkspaceId"
  | "selectedRequestId"
  | "selectedFolderNode"
  | "folderName"
  | "folderEditName"
  | "requestBuilderDraft"
  | "setSearch"
>) {
  const queryClient = useQueryClient();

  const createFolderMutation = useMutation({
    mutationFn: () => {
      if (selectedWorkspaceId == null) {
        throw new Error("No Yaku workspace selected");
      }
      return createYakuFolder({
        workspaceId: selectedWorkspaceId,
        name: folderName.trim() || "New Folder",
        parentId: requestBuilderDraft.parentId === "__root__" ? null : requestBuilderDraft.parentId,
      });
    },
    onSuccess: async (folder) => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "requests", selectedWorkspaceId] });
      requestBuilderDraft.setParentId(folder.id);
      setSearch({ folderId: folder.id, requestId: undefined, runId: undefined });
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: () => {
      if (selectedFolderNode == null) {
        throw new Error("No Yaku folder selected");
      }
      return updateYakuFolder(selectedFolderNode.id, {
        name: folderEditName.trim() || "Folder",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "requests", selectedWorkspaceId] });
    },
  });

  const renameTreeNodeMutation = useMutation({
    mutationFn: async (input: { item: WorkspaceTreeItem; name: string }) => {
      const name = input.name.trim() || input.item.name;
      if (input.item.kind === "folder") {
        await updateYakuFolder(input.item.id, { name });
        return;
      }
      if (input.item.kind === "request") {
        await updateYakuRequest(input.item.requestId ?? input.item.id, { name });
        return;
      }
      throw new Error("Workspace root cannot be renamed");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "requests", selectedWorkspaceId] });
      await queryClient.invalidateQueries({ queryKey: ["yaku", "request", selectedRequestId] });
    },
  });

  const moveNodeMutation = useMutation({
    mutationFn: (input: { nodeId: string; parentId: string | null }) =>
      moveYakuRequestNode(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "requests", selectedWorkspaceId] });
    },
  });

  const reorderTreeMutation = useMutation({
    mutationFn: async (input: { parentId: string | null; children: WorkspaceTreeItem[] }) => {
      await Promise.all(
        input.children
          .filter((item) => item.kind !== "workspace_root")
          .map((item, index) =>
            moveYakuRequestNode({
              nodeId: item.id,
              parentId: input.parentId,
              sortKey: String((index + 1) * 1000),
            }),
          ),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "requests", selectedWorkspaceId] });
    },
  });

  const deleteFolderNodeMutation = useMutation({
    mutationFn: () => {
      if (selectedFolderNode == null) {
        throw new Error("No Yaku folder selected");
      }
      return deleteYakuRequestNode(selectedFolderNode.id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["yaku", "requests", selectedWorkspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "run-events"] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "run-bodies"] }),
      ]);
      setSearch({ requestId: undefined, runId: undefined, folderId: undefined });
    },
  });

  const deleteTreeNodeMutation = useMutation({
    mutationFn: (item: WorkspaceTreeItem) => {
      if (item.kind === "workspace_root") {
        throw new Error("Workspace root cannot be deleted");
      }
      return deleteYakuRequestNode(item.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "requests", selectedWorkspaceId] });
      setSearch({ folderId: undefined, requestId: undefined, runId: undefined });
    },
  });

  return {
    createFolderMutation,
    updateFolderMutation,
    renameTreeNodeMutation,
    moveNodeMutation,
    reorderTreeMutation,
    deleteFolderNodeMutation,
    deleteTreeNodeMutation,
  };
}
