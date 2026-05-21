export type ConfigPair = {
  id: string;
  name: string;
  value: string;
  enabled?: boolean;
};

export type YakuWorkspaceSearch = {
  workspaceId?: string;
  folderId?: string;
  requestId?: string;
  runId?: string;
  environmentId?: string;
};

export type WorkspaceTreeItem = {
  id: string;
  workspaceId: string;
  parentId: string | null;
  requestId: string | null;
  kind: "workspace_root" | "folder" | "request";
  name: string;
  sortKey: string;
  directRequestCount?: number;
};
