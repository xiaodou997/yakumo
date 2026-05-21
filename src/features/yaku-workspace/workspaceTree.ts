import type { TreeNode } from "../../components/core/tree/common";
import type { YakuRequestNodePageItem } from "../../lib/yaku-client";
import type { WorkspaceTreeItem } from "./types";

export function buildWorkspaceTree(
  workspace: { id: string; name: string } | null,
  nodes: YakuRequestNodePageItem[],
) {
  if (workspace == null) return null;
  const childrenByParent = new Map<string | null, YakuRequestNodePageItem[]>();
  for (const node of nodes) {
    const key = node.parentId ?? null;
    const items = childrenByParent.get(key) ?? [];
    items.push(node);
    childrenByParent.set(key, items);
  }

  const directRequestCountByParent = new Map<string, number>();
  for (const node of nodes) {
    if (node.requestId == null || node.parentId == null) continue;
    directRequestCountByParent.set(
      node.parentId,
      (directRequestCountByParent.get(node.parentId) ?? 0) + 1,
    );
  }

  const buildChildren = (parentId: string | null): TreeNode<WorkspaceTreeItem>[] =>
    (childrenByParent.get(parentId) ?? [])
      .sort(compareYakuTreeNodes)
      .map((node) =>
        node.kind === "folder"
          ? {
              item: {
                id: node.id,
                workspaceId: node.workspaceId,
                parentId: node.parentId,
                requestId: node.requestId,
                kind: "folder" as const,
                name: node.name,
                sortKey: node.sortKey,
                directRequestCount: directRequestCountByParent.get(node.id) ?? 0,
              },
              children: buildChildren(node.id),
              parent: null,
              depth: 0,
            }
          : {
              item: {
                id: node.id,
                workspaceId: node.workspaceId,
                parentId: node.parentId,
                requestId: node.requestId,
                kind: "request" as const,
                name: node.name,
                sortKey: node.sortKey,
              },
              parent: null,
              depth: 0,
            },
      );

  const root: TreeNode<WorkspaceTreeItem> = {
    item: {
      id: `workspace:${workspace.id}`,
      workspaceId: workspace.id,
      parentId: null,
      requestId: null,
      kind: "workspace_root",
      name: workspace.name,
      sortKey: "0",
    },
    parent: null,
    depth: 0,
    children: buildChildren(null),
  };

  const fixParents = (node: TreeNode<WorkspaceTreeItem>, depth: number, parent: TreeNode<WorkspaceTreeItem> | null) => {
    node.parent = parent;
    node.depth = depth;
    for (const child of node.children ?? []) {
      fixParents(child, depth + 1, node);
    }
  };
  fixParents(root, 0, null);
  return root;
}

export function collectFolderDescendantIds(nodes: YakuRequestNodePageItem[], folderId: string) {
  const childrenByParent = new Map<string | null, YakuRequestNodePageItem[]>();
  for (const node of nodes) {
    if (node.kind !== "folder") continue;
    const key = node.parentId ?? null;
    const items = childrenByParent.get(key) ?? [];
    items.push(node);
    childrenByParent.set(key, items);
  }

  const descendants: string[] = [];
  const visit = (parentId: string) => {
    for (const child of childrenByParent.get(parentId) ?? []) {
      descendants.push(child.id);
      visit(child.id);
    }
  };
  visit(folderId);
  return descendants;
}

function compareYakuTreeNodes(a: YakuRequestNodePageItem, b: YakuRequestNodePageItem) {
  if (a.sortKey === b.sortKey) {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  }
  return a.sortKey.localeCompare(b.sortKey);
}
