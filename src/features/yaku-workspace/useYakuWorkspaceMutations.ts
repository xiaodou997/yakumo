import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  cancelYakuRun,
  clearYakuRunRetention,
  createYakuEnvironment,
  createYakuFolder,
  createYakuRequest,
  createYakuWorkspace,
  deleteYakuEnvironment,
  deleteYakuRequestNode,
  exportYakuWorkspaceBackup,
  gcYakuBodies,
  importYakuWorkspaceBackup,
  moveYakuRequestNode,
  setYakuRunRetention,
  startYakuRun,
  updateYakuEnvironment,
  updateYakuFolder,
  updateYakuRequest,
  type YakuProtocol,
  type YakuRequest,
  type YakuRequestNodePageItem,
  type YakuWorkspace,
} from "../../lib/yaku-client";
import type { ConfigPair, WorkspaceTreeItem, YakuWorkspaceSearch } from "./types";
import { buildRequestConfigDraft } from "./requestConfig";

export function useYakuWorkspaceMutations({
  selectedWorkspaceId,
  selectedWorkspace,
  selectedEnvironmentId,
  selectedRequestId,
  selectedRunId,
  selectedFolderNode,
  selectedRequestNode,
  loadedRequest,
  workspaceName,
  environmentName,
  environmentVariablesText,
  folderName,
  folderEditName,
  requestParentId,
  setRequestParentId,
  requestName,
  requestProtocol,
  requestUrl,
  requestHttpMethod,
  requestHttpBody,
  requestHeaders,
  requestQueryParams,
  requestFollowRedirects,
  requestTimeoutMs,
  requestGrpcService,
  requestGrpcMethod,
  requestGrpcMessage,
  requestGrpcMetadata,
  requestGrpcUseReflection,
  requestWebSocketMessages,
  requestWebSocketMaxMessages,
  requestEditName,
  requestEditDescription,
  requestConfigText,
  requestEditUrl,
  requestEditHttpMethod,
  requestEditHttpBody,
  requestEditHeaders,
  requestEditQueryParams,
  requestEditFollowRedirects,
  requestEditTimeoutMs,
  requestEditGrpcService,
  requestEditGrpcMethod,
  requestEditGrpcMessage,
  requestEditGrpcMetadata,
  requestEditGrpcUseReflection,
  requestEditWebSocketMessages,
  requestEditWebSocketMaxMessages,
  setSearch,
}: {
  selectedWorkspaceId: string | null | undefined;
  selectedWorkspace: YakuWorkspace | null | undefined;
  selectedEnvironmentId: string | null | undefined;
  selectedRequestId: string | null | undefined;
  selectedRunId: string | null | undefined;
  selectedFolderNode: YakuRequestNodePageItem | null | undefined;
  selectedRequestNode: (YakuRequestNodePageItem & { requestId: string }) | null | undefined;
  loadedRequest: YakuRequest | null | undefined;
  workspaceName: string;
  environmentName: string;
  environmentVariablesText: string;
  folderName: string;
  folderEditName: string;
  requestParentId: string;
  setRequestParentId: (value: string) => void;
  requestName: string;
  requestProtocol: YakuProtocol;
  requestUrl: string;
  requestHttpMethod: string;
  requestHttpBody: string;
  requestHeaders: ConfigPair[];
  requestQueryParams: ConfigPair[];
  requestFollowRedirects: boolean;
  requestTimeoutMs: string;
  requestGrpcService: string;
  requestGrpcMethod: string;
  requestGrpcMessage: string;
  requestGrpcMetadata: ConfigPair[];
  requestGrpcUseReflection: boolean;
  requestWebSocketMessages: string;
  requestWebSocketMaxMessages: string;
  requestEditName: string;
  requestEditDescription: string;
  requestConfigText: string;
  requestEditUrl: string;
  requestEditHttpMethod: string;
  requestEditHttpBody: string;
  requestEditHeaders: ConfigPair[];
  requestEditQueryParams: ConfigPair[];
  requestEditFollowRedirects: boolean;
  requestEditTimeoutMs: string;
  requestEditGrpcService: string;
  requestEditGrpcMethod: string;
  requestEditGrpcMessage: string;
  requestEditGrpcMetadata: ConfigPair[];
  requestEditGrpcUseReflection: boolean;
  requestEditWebSocketMessages: string;
  requestEditWebSocketMaxMessages: string;
  setSearch: (patch: Partial<YakuWorkspaceSearch>) => void;
}) {
  const queryClient = useQueryClient();

  const invalidateRunData = useCallback(
    async (runId: string, requestId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["yaku", "runs", "request", requestId] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "run-events", runId] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "run-bodies", runId] }),
      ]);
    },
    [queryClient],
  );

  const startRunMutation = useMutation({
    mutationFn: async () => {
      if (selectedRequestId == null) {
        throw new Error("No Yaku request selected");
      }
      return startYakuRun(selectedRequestId, selectedEnvironmentId);
    },
    onSuccess: async (run) => {
      await invalidateRunData(run.id, run.requestId);
      setSearch({ runId: run.id });
    },
  });

  const cancelRunMutation = useMutation({
    mutationFn: async () => {
      if (selectedRunId == null) {
        throw new Error("No Yaku run selected");
      }
      return cancelYakuRun(selectedRunId);
    },
    onSuccess: async (run) => {
      await invalidateRunData(run.id, run.requestId);
    },
  });

  const startTreeRequestMutation = useMutation({
    mutationFn: (item: WorkspaceTreeItem) => {
      if (item.kind !== "request") {
        throw new Error("Only Yaku requests can be sent");
      }
      return startYakuRun(item.requestId ?? item.id, selectedEnvironmentId);
    },
    onSuccess: async (run, item) => {
      await invalidateRunData(run.id, run.requestId);
      setSearch({
        runId: run.id,
        requestId: item.kind === "request" ? (item.requestId ?? undefined) : undefined,
        folderId: undefined,
      });
    },
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: () => createYakuWorkspace(workspaceName.trim() || "New Workspace"),
    onSuccess: async (workspace) => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "workspaces"] });
      setSearch({
        workspaceId: workspace.id,
        folderId: undefined,
        requestId: undefined,
        runId: undefined,
        environmentId: undefined,
      });
    },
  });

  const createEnvironmentMutation = useMutation({
    mutationFn: () => {
      if (selectedWorkspaceId == null) {
        throw new Error("No Yaku workspace selected");
      }
      return createYakuEnvironment(
        selectedWorkspaceId,
        environmentName.trim() || "New Environment",
        parseJsonObject(environmentVariablesText, "Environment variables"),
      );
    },
    onSuccess: async (environment) => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "environments", selectedWorkspaceId] });
      setSearch({ environmentId: environment.id });
    },
  });

  const updateEnvironmentMutation = useMutation({
    mutationFn: () => {
      if (selectedEnvironmentId == null) {
        throw new Error("No Yaku environment selected");
      }
      return updateYakuEnvironment(selectedEnvironmentId, {
        name: environmentName.trim() || "Environment",
        variables: parseJsonObject(environmentVariablesText, "Environment variables"),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "environments", selectedWorkspaceId] });
    },
  });

  const deleteEnvironmentMutation = useMutation({
    mutationFn: () => {
      if (selectedEnvironmentId == null) {
        throw new Error("No Yaku environment selected");
      }
      return deleteYakuEnvironment(selectedEnvironmentId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "environments", selectedWorkspaceId] });
      setSearch({ environmentId: undefined });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: () => {
      if (selectedWorkspaceId == null) {
        throw new Error("No Yaku workspace selected");
      }
      return createYakuFolder({
        workspaceId: selectedWorkspaceId,
        name: folderName.trim() || "New Folder",
        parentId: requestParentId === "__root__" ? null : requestParentId,
      });
    },
    onSuccess: async (folder) => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "requests", selectedWorkspaceId] });
      setRequestParentId(folder.id);
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

  const createRequestMutation = useMutation({
    mutationFn: () => {
      if (selectedWorkspaceId == null) {
        throw new Error("No Yaku workspace selected");
      }
      return createYakuRequest({
        workspaceId: selectedWorkspaceId,
        name: requestName.trim() || "New Request",
        protocol: requestProtocol,
        parentId: requestParentId === "__root__" ? null : requestParentId,
        config: buildRequestConfigDraft({
          protocol: requestProtocol,
          url: requestUrl,
          httpMethod: requestHttpMethod,
          httpBody: requestHttpBody,
          headers: requestHeaders,
          query: requestQueryParams,
          followRedirects: requestFollowRedirects,
          timeoutMs: requestTimeoutMs,
          grpcService: requestGrpcService,
          grpcMethod: requestGrpcMethod,
          grpcMessage: requestGrpcMessage,
          grpcMetadata: requestGrpcMetadata,
          grpcUseReflection: requestGrpcUseReflection,
          webSocketMessages: requestWebSocketMessages,
          webSocketMaxMessages: requestWebSocketMaxMessages,
        }),
      });
    },
    onSuccess: async (request) => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "requests", selectedWorkspaceId] });
      setSearch({ requestId: request.id, runId: undefined, folderId: undefined });
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: (mode: "structured" | "raw" = "structured") => {
      if (selectedRequestId == null) {
        throw new Error("No Yaku request selected");
      }
      if (loadedRequest == null) {
        throw new Error("No Yaku request loaded");
      }
      return updateYakuRequest(selectedRequestId, {
        name: requestEditName.trim() || "Request",
        description: requestEditDescription,
        config:
          mode === "raw"
            ? parseJsonObject(requestConfigText, "Request config")
            : buildRequestConfigDraft({
                protocol: loadedRequest.protocol,
                url: requestEditUrl,
                httpMethod: requestEditHttpMethod,
                httpBody: requestEditHttpBody,
                headers: requestEditHeaders,
                query: requestEditQueryParams,
                followRedirects: requestEditFollowRedirects,
                timeoutMs: requestEditTimeoutMs,
                grpcService: requestEditGrpcService,
                grpcMethod: requestEditGrpcMethod,
                grpcMessage: requestEditGrpcMessage,
                grpcMetadata: requestEditGrpcMetadata,
                grpcUseReflection: requestEditGrpcUseReflection,
                webSocketMessages: requestEditWebSocketMessages,
                webSocketMaxMessages: requestEditWebSocketMaxMessages,
              }),
      });
    },
    onSuccess: async (request) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["yaku", "requests", selectedWorkspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "request", request.id] }),
      ]);
    },
  });

  const deleteRequestNodeMutation = useMutation({
    mutationFn: () => {
      if (selectedRequestNode == null) {
        throw new Error("No Yaku request node selected");
      }
      return deleteYakuRequestNode(selectedRequestNode.id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["yaku", "requests", selectedWorkspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "runs", "request", selectedRequestId] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "run-events"] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "run-bodies"] }),
      ]);
      setSearch({ requestId: undefined, runId: undefined, folderId: undefined });
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

  const setRetentionMutation = useMutation({
    mutationFn: (keepLast: number) => {
      if (selectedWorkspaceId == null) {
        throw new Error("No Yaku workspace selected");
      }
      return setYakuRunRetention(selectedWorkspaceId, keepLast);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "run-retention", selectedWorkspaceId] });
    },
  });

  const clearRetentionMutation = useMutation({
    mutationFn: () => {
      if (selectedWorkspaceId == null) {
        throw new Error("No Yaku workspace selected");
      }
      return clearYakuRunRetention(selectedWorkspaceId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "run-retention", selectedWorkspaceId] });
    },
  });

  const gcBodiesMutation = useMutation({
    mutationFn: () => gcYakuBodies(false),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["yaku", "run-bodies"] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "run-body-bytes"] }),
      ]);
    },
  });

  const exportBackupMutation = useMutation({
    mutationFn: async () => {
      if (selectedWorkspace == null) {
        throw new Error("No Yaku workspace selected");
      }
      const exportPath = await save({
        title: "Export Yaku Workspace Backup",
        defaultPath: `yaku.${slugFilePart(selectedWorkspace.name)}.json`,
        filters: [{ name: "Yaku Workspace Backup", extensions: ["json"] }],
      });
      if (exportPath == null) {
        return null;
      }
      return exportYakuWorkspaceBackup(selectedWorkspace.id, exportPath);
    },
  });

  const importBackupMutation = useMutation({
    mutationFn: async () => {
      const filePath = await open({
        title: "Import Yaku Workspace Backup",
        multiple: false,
        filters: [{ name: "Yaku Workspace Backup", extensions: ["json"] }],
      });
      if (typeof filePath !== "string") {
        return null;
      }
      return importYakuWorkspaceBackup(filePath, true);
    },
    onSuccess: async (response) => {
      if (response == null) {
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["yaku", "workspaces"] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "requests", response.workspace.id] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "environments", response.workspace.id] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "run-retention", response.workspace.id] }),
      ]);
      setSearch({
        workspaceId: response.workspace.id,
        folderId: undefined,
        requestId: undefined,
        runId: undefined,
        environmentId: undefined,
      });
    },
  });

  return {
    invalidateRunData,
    startRunMutation,
    startTreeRequestMutation,
    cancelRunMutation,
    createWorkspaceMutation,
    createEnvironmentMutation,
    updateEnvironmentMutation,
    deleteEnvironmentMutation,
    createFolderMutation,
    updateFolderMutation,
    renameTreeNodeMutation,
    moveNodeMutation,
    reorderTreeMutation,
    createRequestMutation,
    updateRequestMutation,
    deleteRequestNodeMutation,
    deleteFolderNodeMutation,
    deleteTreeNodeMutation,
    setRetentionMutation,
    clearRetentionMutation,
    gcBodiesMutation,
    exportBackupMutation,
    importBackupMutation,
  };
}

function parseJsonObject(input: string, label: string): Record<string, unknown> {
  const parsed = JSON.parse(input) as unknown;
  if (parsed == null || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

function slugFilePart(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "workspace";
}
