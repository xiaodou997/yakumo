import { useCallback } from "react";
import type { DropdownItem } from "../../components/core/Dropdown";
import type { TreeHandle, TreeProps } from "../../components/core/tree/Tree";
import type { WorkspaceTreeItem } from "./types";

export function useYakuWorkspaceTreeActions({
  treeRef,
  setSearch,
  requestBuilderSetParentId,
  renameTreeNode,
  deleteTreeNode,
  startTreeRequest,
}: {
  treeRef: React.RefObject<TreeHandle | null>;
  setSearch: (patch: { folderId?: string; requestId?: string; runId?: string }) => void;
  requestBuilderSetParentId: (parentId: string) => void;
  renameTreeNode: (args: { item: WorkspaceTreeItem; name: string }) => Promise<unknown>;
  deleteTreeNode: (item: WorkspaceTreeItem) => void;
  startTreeRequest: (item: WorkspaceTreeItem) => void;
}) {
  const handleWorkspaceTreeActivate = useCallback(
    (item: WorkspaceTreeItem) => {
      if (item.kind === "folder") {
        setSearch({ folderId: item.id, requestId: undefined, runId: undefined });
        requestBuilderSetParentId(item.id);
        return;
      }
      if (item.kind === "request" && item.requestId != null) {
        setSearch({ requestId: item.requestId, runId: undefined, folderId: undefined });
        requestBuilderSetParentId(item.parentId ?? "__root__");
      }
    },
    [requestBuilderSetParentId, setSearch],
  );

  const handleWorkspaceTreeGetEditOptions = useCallback<
    NonNullable<TreeProps<WorkspaceTreeItem>["getEditOptions"]>
  >((item) => {
    return {
      defaultValue: item.name,
      placeholder: item.kind === "folder" ? "Folder name" : "Request name",
      onChange: async (_item, text) => {
        if (item.kind === "workspace_root") return;
        await renameTreeNode({ item, name: text });
      },
    };
  }, [renameTreeNode]);

  const handleWorkspaceTreeGetContextMenu = useCallback<
    NonNullable<TreeProps<WorkspaceTreeItem>["getContextMenu"]>
  >(async (items) => {
    const nodes = items.filter((item): item is WorkspaceTreeItem => item.kind !== "workspace_root");
    if (nodes.length === 0) return [];
    const first = nodes[0];
    if (first == null) return [];
    const menuItems: Array<DropdownItem | null> = [
      {
        label: "Open",
        icon: first.kind === "folder" ? "folder_open" : "send_horizontal",
        onSelect: () => handleWorkspaceTreeActivate(first),
      },
      first.kind === "request"
        ? {
            label: "Send Request",
            icon: "send_horizontal",
            onSelect: () => startTreeRequest(first),
          }
        : null,
      {
        label: "Rename",
        icon: "pencil",
        onSelect: () => treeRef.current?.renameItem(first.id),
      },
      {
        label: first.kind === "folder" ? "Delete Folder" : "Delete Request",
        icon: "trash",
        color: "danger",
        onSelect: () => deleteTreeNode(first),
      },
    ];
    return menuItems.filter((item): item is DropdownItem => item != null);
  }, [deleteTreeNode, handleWorkspaceTreeActivate, startTreeRequest, treeRef]);

  return {
    handleWorkspaceTreeActivate,
    handleWorkspaceTreeGetEditOptions,
    handleWorkspaceTreeGetContextMenu,
  };
}
