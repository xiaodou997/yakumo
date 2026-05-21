import type { RefObject } from "react";
import type { TreeHandle, TreeProps } from "../../components/core/tree/Tree";
import { Tree } from "../../components/core/tree/Tree";
import type { TreeNode } from "../../components/core/tree/common";
import type { WorkspaceTreeItem } from "./types";
import { EmptyCopy, WorkspacePanel } from "./WorkspacePanels";

export function WorkspaceTreePanel({
  workspaceId,
  workspaceTree,
  treeRef,
  getContextMenu,
  getEditOptions,
  onActivate,
  onReorder,
}: {
  workspaceId: string | null | undefined;
  workspaceTree: TreeNode<WorkspaceTreeItem> | null | undefined;
  treeRef: RefObject<TreeHandle | null>;
  getContextMenu: NonNullable<TreeProps<WorkspaceTreeItem>["getContextMenu"]>;
  getEditOptions: NonNullable<TreeProps<WorkspaceTreeItem>["getEditOptions"]>;
  onActivate: (item: WorkspaceTreeItem) => void;
  onReorder: (parentId: string | null, children: WorkspaceTreeItem[]) => void;
}) {
  return (
    <WorkspacePanel title="Workspace Tree" subtitle="Nested folders and requests in the selected workspace.">
      {workspaceTree == null ? (
        <EmptyCopy>Select a workspace to view its tree.</EmptyCopy>
      ) : workspaceTree.children == null || workspaceTree.children.length === 0 ? (
        <EmptyCopy>No Yaku folders or requests found in this workspace.</EmptyCopy>
      ) : (
        <Tree
          ref={treeRef}
          treeId={`yaku-workspace-${workspaceId ?? "none"}`}
          className="px-1"
          root={workspaceTree}
          getItemKey={(item) => `${item.id}::${item.kind}::${item.name}::${item.sortKey}`}
          getContextMenu={getContextMenu}
          getEditOptions={getEditOptions}
          ItemInner={WorkspaceTreeItemInner}
          ItemRightSlot={WorkspaceTreeItemRightSlot}
          onActivate={onActivate}
          onDragEnd={({ parent, children, items, insertAt }) => {
            const nextChildren = [...children];
            nextChildren.splice(insertAt, 0, ...items);
            onReorder(parent.kind === "workspace_root" ? null : parent.id, nextChildren as WorkspaceTreeItem[]);
          }}
        />
      )}
    </WorkspacePanel>
  );
}

function WorkspaceTreeItemInner({ item }: { treeId: string; item: WorkspaceTreeItem }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium">{item.name}</div>
      <div className="truncate text-[10px] uppercase tracking-[0.14em] text-text-subtlest">
        {item.kind === "request" ? item.requestId : item.id}
      </div>
    </div>
  );
}

function WorkspaceTreeItemRightSlot({ item }: { treeId: string; item: WorkspaceTreeItem }) {
  if (item.kind === "folder") {
    return (
      <div className="mr-1 rounded-full border border-border-subtle px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-text-subtle">
        {item.directRequestCount ?? 0} reqs
      </div>
    );
  }
  if (item.kind === "request") {
    return (
      <div className="mr-1 rounded-full border border-border-subtle px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-text-subtle">
        Request
      </div>
    );
  }
  return null;
}
