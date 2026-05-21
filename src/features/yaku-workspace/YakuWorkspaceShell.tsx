import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { open, save } from "@tauri-apps/plugin-dialog";
import classNames from "classnames";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "../../components/core/Button";
import type { DropdownItem } from "../../components/core/Dropdown";
import { FormattedError } from "../../components/core/FormattedError";
import { Heading } from "../../components/core/Heading";
import { Select } from "../../components/core/Select";
import { HStack, VStack } from "../../components/core/Stacks";
import type { TreeHandle, TreeProps } from "../../components/core/tree/Tree";
import { Tree } from "../../components/core/tree/Tree";
import type { TreeNode } from "../../components/core/tree/common";
import {
  YAKU_RUN_EVENT_KIND_OPTIONS,
  cancelYakuRun,
  clearYakuRunRetention,
  createYakuEnvironment,
  createYakuFolder,
  createYakuRequest,
  createYakuWorkspace,
  decodeYakuBody,
  deleteYakuEnvironment,
  deleteYakuRequestNode,
  exportYakuWorkspaceBackup,
  formatJsonIfPossible,
  getYakuRequest,
  getYakuRunBodyBytes,
  getYakuRunRetention,
  gcYakuBodies,
  importYakuWorkspaceBackup,
  listYakuEnvironments,
  listYakuRequests,
  listYakuRunBodies,
  listYakuRunEvents,
  listYakuRunsForRequest,
  listYakuWorkspaces,
  setYakuRunRetention,
  startYakuRun,
  moveYakuRequestNode,
  updateYakuEnvironment,
  updateYakuFolder,
  updateYakuRequest,
  type YakuProtocol,
  type YakuRequestNodePageItem,
  type YakuRunBody,
  type YakuRunEventKind,
  type YakuRunLifecycleEvent,
  yakuEventNames,
} from "../../lib/yaku-client";
import { useListenToTauriEvent } from "../../hooks/useListenToTauriEvent";

export type YakuWorkspaceSearch = {
  workspaceId?: string;
  folderId?: string;
  requestId?: string;
  runId?: string;
  environmentId?: string;
};

type ConfigPair = {
  id: string;
  name: string;
  value: string;
  enabled?: boolean;
};

type WorkspaceTreeItem = {
  id: string;
  workspaceId: string;
  parentId: string | null;
  requestId: string | null;
  kind: "workspace_root" | "folder" | "request";
  name: string;
  sortKey: string;
  directRequestCount?: number;
};

type YakuWorkspaceShellProps = {
  search: YakuWorkspaceSearch;
  setSearch: (patch: Partial<YakuWorkspaceSearch>) => void;
};

export function validateYakuWorkspaceSearch(search: Record<string, unknown>): YakuWorkspaceSearch {
  return {
    workspaceId: asOptionalString(search.workspaceId),
    folderId: asOptionalString(search.folderId),
    requestId: asOptionalString(search.requestId),
    runId: asOptionalString(search.runId),
    environmentId: asOptionalString(search.environmentId),
  };
}

export function cleanYakuWorkspaceSearch(search: YakuWorkspaceSearch) {
  return {
    workspaceId: asOptionalString(search.workspaceId),
    folderId: asOptionalString(search.folderId),
    requestId: asOptionalString(search.requestId),
    runId: asOptionalString(search.runId),
    environmentId: asOptionalString(search.environmentId),
  };
}

export function YakuWorkspaceShell({ search, setSearch }: YakuWorkspaceShellProps) {
  const queryClient = useQueryClient();
  const [eventKind, setEventKind] = useState<"all" | YakuRunEventKind>("all");
  const [selectedBodyId, setSelectedBodyId] = useState<string>("");
  const [workspaceName, setWorkspaceName] = useState("New Workspace");
  const [environmentName, setEnvironmentName] = useState("");
  const [environmentVariablesText, setEnvironmentVariablesText] = useState("{}");
  const [folderName, setFolderName] = useState("New Folder");
  const [folderEditName, setFolderEditName] = useState("");
  const [folderMoveParentId, setFolderMoveParentId] = useState("__root__");
  const [requestName, setRequestName] = useState("New Request");
  const [requestProtocol, setRequestProtocol] = useState<YakuProtocol>("http");
  const [requestUrl, setRequestUrl] = useState("https://example.com");
  const [requestHttpMethod, setRequestHttpMethod] = useState("GET");
  const [requestHttpBody, setRequestHttpBody] = useState("");
  const [requestHeaders, setRequestHeaders] = useState<ConfigPair[]>([]);
  const [requestQueryParams, setRequestQueryParams] = useState<ConfigPair[]>([]);
  const [requestFollowRedirects, setRequestFollowRedirects] = useState(true);
  const [requestTimeoutMs, setRequestTimeoutMs] = useState("");
  const [requestGrpcService, setRequestGrpcService] = useState("");
  const [requestGrpcMethod, setRequestGrpcMethod] = useState("");
  const [requestGrpcMessage, setRequestGrpcMessage] = useState("");
  const [requestGrpcMetadata, setRequestGrpcMetadata] = useState<ConfigPair[]>([]);
  const [requestGrpcUseReflection, setRequestGrpcUseReflection] = useState(true);
  const [requestWebSocketMessages, setRequestWebSocketMessages] = useState("hello");
  const [requestWebSocketMaxMessages, setRequestWebSocketMaxMessages] = useState("1");
  const [requestParentId, setRequestParentId] = useState("__root__");
  const [requestMoveParentId, setRequestMoveParentId] = useState("__root__");
  const [requestEditName, setRequestEditName] = useState("");
  const [requestEditDescription, setRequestEditDescription] = useState("");
  const [requestConfigText, setRequestConfigText] = useState("{}");
  const [requestEditUrl, setRequestEditUrl] = useState("");
  const [requestEditHttpMethod, setRequestEditHttpMethod] = useState("GET");
  const [requestEditHttpBody, setRequestEditHttpBody] = useState("");
  const [requestEditHeaders, setRequestEditHeaders] = useState<ConfigPair[]>([]);
  const [requestEditQueryParams, setRequestEditQueryParams] = useState<ConfigPair[]>([]);
  const [requestEditFollowRedirects, setRequestEditFollowRedirects] = useState(true);
  const [requestEditTimeoutMs, setRequestEditTimeoutMs] = useState("");
  const [requestEditGrpcService, setRequestEditGrpcService] = useState("");
  const [requestEditGrpcMethod, setRequestEditGrpcMethod] = useState("");
  const [requestEditGrpcMessage, setRequestEditGrpcMessage] = useState("");
  const [requestEditGrpcMetadata, setRequestEditGrpcMetadata] = useState<ConfigPair[]>([]);
  const [requestEditGrpcUseReflection, setRequestEditGrpcUseReflection] = useState(true);
  const [requestEditWebSocketMessages, setRequestEditWebSocketMessages] = useState("");
  const [requestEditWebSocketMaxMessages, setRequestEditWebSocketMaxMessages] = useState("1");

  const workspacesQuery = useQuery({
    queryKey: ["yaku", "workspaces"],
    queryFn: () => listYakuWorkspaces(),
    placeholderData: (prev) => prev,
  });
  const workspaces = workspacesQuery.data?.items ?? [];
  const selectedWorkspaceId = resolveSelectedId(workspaces, search.workspaceId);
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null;

  const environmentsQuery = useQuery({
    enabled: selectedWorkspaceId != null,
    queryKey: ["yaku", "environments", selectedWorkspaceId],
    queryFn: () => listYakuEnvironments(selectedWorkspaceId!),
    placeholderData: (prev) => prev,
  });
  const environments = environmentsQuery.data ?? [];
  const selectedEnvironmentId = resolveSelectedId(environments, search.environmentId);
  const selectedEnvironment =
    environments.find((environment) => environment.id === selectedEnvironmentId) ?? null;

  const retentionQuery = useQuery({
    enabled: selectedWorkspaceId != null,
    queryKey: ["yaku", "run-retention", selectedWorkspaceId],
    queryFn: () => getYakuRunRetention(selectedWorkspaceId!),
    placeholderData: (prev) => prev,
  });

  const requestsQuery = useQuery({
    enabled: selectedWorkspaceId != null,
    queryKey: ["yaku", "requests", selectedWorkspaceId],
    queryFn: () => listYakuRequests(selectedWorkspaceId!),
    placeholderData: (prev) => prev,
  });
  const requestNodes = useMemo(
    () =>
      (requestsQuery.data?.items ?? []).filter(
        (item): item is YakuRequestNodePageItem & { requestId: string } => item.requestId != null,
      ),
    [requestsQuery.data?.items],
  );
  const requestTreeNodes = requestsQuery.data?.items ?? [];
  const folderNodes = useMemo(
    () => requestTreeNodes.filter((item) => item.kind === "folder"),
    [requestTreeNodes],
  );
  const workspaceTree = useMemo(
    () => buildWorkspaceTree(selectedWorkspace, requestTreeNodes),
    [requestTreeNodes, selectedWorkspace],
  );
  const selectedFolderNode = folderNodes.find((node) => node.id === search.folderId) ?? null;
  const selectedRequestId =
    search.folderId != null
      ? search.requestId ?? undefined
      : resolveSelectedRequestId(requestNodes, search.requestId);
  const selectedRequestNode =
    requestNodes.find((node) => node.requestId === selectedRequestId) ?? null;
  const treeRef = useRef<TreeHandle>(null);

  const requestQuery = useQuery({
    enabled: selectedRequestId != null,
    queryKey: ["yaku", "request", selectedRequestId],
    queryFn: () => getYakuRequest(selectedRequestId!),
  });

  const runsQuery = useQuery({
    enabled: selectedRequestId != null,
    queryKey: ["yaku", "runs", "request", selectedRequestId],
    queryFn: () => listYakuRunsForRequest(selectedRequestId!),
    placeholderData: (prev) => prev,
    refetchInterval: (query) =>
      query.state.data?.items.some((run) => run.state === "running") ? 750 : false,
  });
  const runs = runsQuery.data?.items ?? [];
  const selectedRunId = resolveSelectedId(runs, search.runId);
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? null;
  const selectedRunIsRunning = selectedRun?.state === "running";

  const runEventsQuery = useQuery({
    enabled: selectedRunId != null,
    queryKey: ["yaku", "run-events", selectedRunId, eventKind],
    queryFn: () => listYakuRunEvents(selectedRunId!, eventKind === "all" ? null : eventKind),
    placeholderData: (prev) => prev,
    refetchInterval: selectedRunIsRunning ? 750 : false,
  });

  const runBodiesQuery = useQuery({
    enabled: selectedRunId != null,
    queryKey: ["yaku", "run-bodies", selectedRunId],
    queryFn: () => listYakuRunBodies(selectedRunId!),
    placeholderData: (prev) => prev,
    refetchInterval: selectedRunIsRunning ? 1000 : false,
  });
  const runBodies = runBodiesQuery.data ?? [];

  useEffect(() => {
    if (!workspacesQuery.isSuccess) return;
    if (search.workspaceId !== selectedWorkspaceId) {
      setSearch({
        workspaceId: selectedWorkspaceId,
        folderId: undefined,
        requestId: undefined,
        runId: undefined,
        environmentId: undefined,
      });
    }
  }, [search.workspaceId, selectedWorkspaceId, setSearch, workspacesQuery.isSuccess]);

  useEffect(() => {
    if (!environmentsQuery.isSuccess) return;
    if (search.environmentId !== selectedEnvironmentId) {
      setSearch({ environmentId: selectedEnvironmentId });
    }
  }, [environmentsQuery.isSuccess, search.environmentId, selectedEnvironmentId, setSearch]);

  useEffect(() => {
    if (!requestsQuery.isSuccess) return;
    if (search.folderId != null) {
      if (search.requestId != null) {
        setSearch({ requestId: undefined, runId: undefined });
      }
      return;
    }
    if (search.requestId !== selectedRequestId) {
      setSearch({ requestId: selectedRequestId, runId: undefined, folderId: undefined });
    }
  }, [requestsQuery.isSuccess, search.folderId, search.requestId, selectedRequestId, setSearch]);

  useEffect(() => {
    if (!requestsQuery.isSuccess) return;
    if (search.folderId != null && selectedFolderNode == null) {
      setSearch({ folderId: undefined });
    }
  }, [requestsQuery.isSuccess, search.folderId, selectedFolderNode, setSearch]);

  useEffect(() => {
    const selectedNodeId = selectedRequestNode?.id ?? selectedFolderNode?.id;
    if (selectedNodeId != null) {
      treeRef.current?.selectItem(selectedNodeId);
    }
  }, [selectedFolderNode?.id, selectedRequestNode?.id]);

  useEffect(() => {
    if (!runsQuery.isSuccess) return;
    if (search.runId !== selectedRunId) {
      setSearch({ runId: selectedRunId });
    }
  }, [runsQuery.isSuccess, search.runId, selectedRunId, setSearch]);

  useEffect(() => {
    setRequestMoveParentId(selectedRequestNode?.parentId ?? "__root__");
  }, [selectedRequestNode?.parentId]);

  useEffect(() => {
    setFolderMoveParentId(selectedFolderNode?.parentId ?? "__root__");
  }, [selectedFolderNode?.parentId]);

  useEffect(() => {
    setFolderEditName(selectedFolderNode?.name ?? "");
  }, [selectedFolderNode?.name]);

  useEffect(() => {
    const nextBodyId = preferredBodyId(runBodies);
    setSelectedBodyId((prev) =>
      runBodies.some((body) => body.id === prev) ? prev : (nextBodyId ?? ""),
    );
  }, [runBodies]);

  useEffect(() => {
    setEnvironmentName(selectedEnvironment?.name ?? "New Environment");
    setEnvironmentVariablesText(JSON.stringify(selectedEnvironment?.variables ?? {}, null, 2));
  }, [selectedEnvironment]);

  useEffect(() => {
    setRequestUrl("https://example.com");
    setRequestHttpMethod(requestProtocol === "graphql" ? "POST" : "GET");
    setRequestHttpBody(requestProtocol === "graphql" ? '{"query":"{ __typename }"}' : "");
    setRequestHeaders([]);
    setRequestQueryParams([]);
    setRequestFollowRedirects(true);
    setRequestTimeoutMs(requestProtocol === "web_socket" || requestProtocol === "grpc" ? "30000" : "");
    setRequestGrpcService("");
    setRequestGrpcMethod("");
    setRequestGrpcMessage("");
    setRequestGrpcMetadata([]);
    setRequestGrpcUseReflection(true);
    setRequestWebSocketMessages("hello");
    setRequestWebSocketMaxMessages("1");
  }, [requestProtocol]);

  useEffect(() => {
    if (requestQuery.data == null) {
      setRequestEditName("");
      setRequestEditDescription("");
      setRequestConfigText("{}");
      return;
    }
    setRequestEditName(requestQuery.data.name);
    setRequestEditDescription(requestQuery.data.description);
    setRequestConfigText(JSON.stringify(requestQuery.data.config, null, 2));
    const draft = draftFromRequestConfig(requestQuery.data.protocol, requestQuery.data.config);
    setRequestEditUrl(draft.url);
    setRequestEditHttpMethod(draft.httpMethod);
    setRequestEditHttpBody(draft.httpBody);
    setRequestEditHeaders(draft.headers);
    setRequestEditQueryParams(draft.query);
    setRequestEditFollowRedirects(draft.followRedirects);
    setRequestEditTimeoutMs(draft.timeoutMs);
    setRequestEditGrpcService(draft.grpcService);
    setRequestEditGrpcMethod(draft.grpcMethod);
    setRequestEditGrpcMessage(draft.grpcMessage);
    setRequestEditGrpcMetadata(draft.grpcMetadata);
    setRequestEditGrpcUseReflection(draft.grpcUseReflection);
    setRequestEditWebSocketMessages(draft.webSocketMessages);
    setRequestEditWebSocketMaxMessages(draft.webSocketMaxMessages);
  }, [requestQuery.data]);

  const runBodyBytesQuery = useQuery({
    enabled: selectedBodyId !== "",
    queryKey: ["yaku", "run-body-bytes", selectedBodyId],
    queryFn: () => getYakuRunBodyBytes(selectedBodyId),
  });

  const bodyText = useMemo(() => {
    if (runBodyBytesQuery.data == null) return "";
    return decodeYakuBody(runBodyBytesQuery.data);
  }, [runBodyBytesQuery.data]);
  const deferredBodyText = useDeferredValue(bodyText);

  const selectedBody = runBodies.find((body) => body.id === selectedBodyId) ?? null;
  const formattedBodyText = useMemo(() => {
    if (selectedBody?.contentType?.includes("json")) {
      return formatJsonIfPossible(deferredBodyText);
    }
    return deferredBodyText;
  }, [deferredBodyText, selectedBody?.contentType]);

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

  useListenToTauriEvent<YakuRunLifecycleEvent>(yakuEventNames.runLifecycle, ({ payload }) => {
    void invalidateRunData(payload.runId, payload.requestId);
  });

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

  const handleWorkspaceTreeActivate = useCallback(
    (item: WorkspaceTreeItem) => {
      if (item.kind === "folder") {
        setSearch({ folderId: item.id, requestId: undefined, runId: undefined });
        setRequestParentId(item.id);
        return;
      }
      if (item.kind === "request" && item.requestId != null) {
        setSearch({ requestId: item.requestId, runId: undefined, folderId: undefined });
        setRequestParentId(item.parentId ?? "__root__");
      }
    },
    [setSearch],
  );

  const handleWorkspaceTreeGetEditOptions = useCallback<
    NonNullable<TreeProps<WorkspaceTreeItem>["getEditOptions"]>
  >((item) => {
    return {
      defaultValue: item.name,
      placeholder: item.kind === "folder" ? "Folder name" : "Request name",
      onChange: (_item, text) => {
        if (item.kind === "workspace_root") return;
        void renameTreeNodeMutation.mutateAsync({ item, name: text });
      },
    };
  }, [renameTreeNodeMutation]);

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
            onSelect: async () => {
              const run = await startYakuRun(first.requestId ?? first.id, selectedEnvironmentId);
              await invalidateRunData(run.id, run.requestId);
              setSearch({ runId: run.id, requestId: first.requestId ?? undefined, folderId: undefined });
            },
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
        onSelect: async () => {
          await deleteYakuRequestNode(first.id);
          await queryClient.invalidateQueries({ queryKey: ["yaku", "requests", selectedWorkspaceId] });
          setSearch({ folderId: undefined, requestId: undefined, runId: undefined });
        },
      },
    ];
    return menuItems.filter((item): item is DropdownItem => item != null);
  }, [
    deleteYakuRequestNode,
    handleWorkspaceTreeActivate,
    invalidateRunData,
    queryClient,
    renameTreeNodeMutation,
    selectedEnvironmentId,
    selectedWorkspaceId,
    setSearch,
  ]);

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
      if (requestQuery.data == null) {
        throw new Error("No Yaku request loaded");
      }
      return updateYakuRequest(selectedRequestId, {
        name: requestEditName.trim() || "Request",
        description: requestEditDescription,
        config:
          mode === "raw"
            ? parseJsonObject(requestConfigText, "Request config")
            : buildRequestConfigDraft({
                protocol: requestQuery.data.protocol,
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

  return (
    <div className="h-full overflow-auto bg-surface">
      <div className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col gap-6 px-5 py-5">
        <section className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-highlight/60 px-5 py-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_55%)]"
          />
          <VStack space={4} className="relative">
            <HStack justifyContent="between" alignItems="start" className="gap-4 max-md:flex-col">
              <VStack space={2} className="max-w-3xl">
                <div className="text-xs uppercase tracking-[0.28em] text-text-subtlest">
                  Yaku
                </div>
                <Heading level={1}>Workspace</Heading>
                <p className="max-w-2xl text-sm leading-6 text-text-subtle">
                  Yaku-first workspace shell backed by yaku.sqlite, domain services, and the
                  event-driven run lifecycle. This path no longer depends on the legacy AnyModel
                  workspace surface.
                </p>
              </VStack>
              <HStack space={2} wrap className="shrink-0">
                <Button
                  color="default"
                  isLoading={startRunMutation.isPending}
                  disabled={selectedRequestId == null}
                  onClick={() => startRunMutation.mutate()}
                >
                  Send Selected Request
                </Button>
                <Button
                  color="danger"
                  variant="border"
                  isLoading={cancelRunMutation.isPending}
                  disabled={!selectedRunIsRunning}
                  onClick={() => cancelRunMutation.mutate()}
                >
                  Cancel Run
                </Button>
              </HStack>
            </HStack>

            <div className="grid gap-3 md:grid-cols-4">
              <StatCard label="Workspaces" value={String(workspaces.length)} />
              <StatCard label="Requests" value={String(requestNodes.length)} />
              <StatCard label="Runs" value={String(runs.length)} />
              <StatCard
                label="Latest State"
                value={runs[0]?.state ?? "idle"}
                accent={runs[0]?.state === "completed" ? "success" : runs[0]?.state === "failed" ? "danger" : "default"}
              />
            </div>
          </VStack>
        </section>

        {workspacesQuery.error ? (
          <FormattedError>{String(workspacesQuery.error)}</FormattedError>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,380px)_minmax(0,1fr)]">
            <aside className="flex flex-col gap-4">
              <Panel title="Workspace Context" subtitle="Choose the Yaku workspace and environment.">
                <VStack space={3}>
                  <form
                    className="rounded-xl border border-border-subtle bg-surface p-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      createWorkspaceMutation.mutate();
                    }}
                  >
                    <VStack space={2}>
                      <FieldLabel htmlFor="yaku-workspace-name">Create Workspace</FieldLabel>
                      <input
                        id="yaku-workspace-name"
                        value={workspaceName}
                        onChange={(event) => setWorkspaceName(event.target.value)}
                        className={fieldClassName}
                      />
                      <Button size="xs" type="submit" isLoading={createWorkspaceMutation.isPending}>
                        Create Workspace
                      </Button>
                    </VStack>
                  </form>
                  <Select
                    name="yaku-workspace"
                    label="Workspace"
                    value={selectedWorkspaceId ?? ""}
                    options={selectOptions(workspaces, (workspace) => workspace.name)}
                    onChange={(value) =>
                      setSearch({
                        workspaceId: value,
                        folderId: undefined,
                        requestId: undefined,
                        runId: undefined,
                        environmentId: undefined,
                      })
                    }
                  />
                  <Select
                    name="yaku-environment"
                    label="Environment Override"
                    value={selectedEnvironmentId ?? "__none__"}
                    options={[
                      { label: "No Override", value: "__none__" },
                      ...selectOptions(environments, (environment) => environment.name),
                    ]}
                    onChange={(value) =>
                      setSearch({ environmentId: value === "__none__" ? undefined : value })
                    }
                  />
                  <form
                    className="rounded-xl border border-border-subtle bg-surface p-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      updateEnvironmentMutation.mutate();
                    }}
                  >
                    <VStack space={2}>
                      <FieldLabel htmlFor="yaku-environment-name">Environment Editor</FieldLabel>
                      <input
                        id="yaku-environment-name"
                        value={environmentName}
                        onChange={(event) => setEnvironmentName(event.target.value)}
                        className={fieldClassName}
                      />
                      <textarea
                        value={environmentVariablesText}
                        onChange={(event) => setEnvironmentVariablesText(event.target.value)}
                        rows={5}
                        className={textareaClassName}
                      />
                      <HStack space={2} wrap>
                        <Button
                          size="xs"
                          type="button"
                          disabled={selectedWorkspaceId == null}
                          isLoading={createEnvironmentMutation.isPending}
                          onClick={() => createEnvironmentMutation.mutate()}
                        >
                          Create Env
                        </Button>
                        <Button
                          size="xs"
                          type="submit"
                          variant="border"
                          disabled={selectedEnvironmentId == null}
                          isLoading={updateEnvironmentMutation.isPending}
                        >
                          Save Env
                        </Button>
                        <Button
                          size="xs"
                          type="button"
                          variant="border"
                          color="danger"
                          disabled={selectedEnvironmentId == null}
                          isLoading={deleteEnvironmentMutation.isPending}
                          onClick={() => deleteEnvironmentMutation.mutate()}
                        >
                          Delete Env
                        </Button>
                      </HStack>
                    </VStack>
                  </form>
                  <div className="rounded-xl border border-border-subtle bg-surface p-3">
                    <div className="mb-1 text-xs uppercase tracking-[0.2em] text-text-subtlest">
                      Environment Variables
                    </div>
                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs text-text-subtle">
                      {JSON.stringify(
                        environments.find((environment) => environment.id === selectedEnvironmentId)
                          ?.variables ?? {},
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                  <div className="rounded-xl border border-border-subtle bg-surface p-3">
                    <HStack justifyContent="between" alignItems="start" className="gap-3">
                      <VStack space={1}>
                        <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">
                          Run Retention
                        </div>
                        <div className="text-sm text-text">
                          {retentionQuery.data == null
                            ? "Unlimited"
                            : `${retentionQuery.data.toLocaleString()} runs`}
                        </div>
                      </VStack>
                      <Button
                        size="xs"
                        variant="border"
                        isLoading={gcBodiesMutation.isPending}
                        onClick={() => gcBodiesMutation.mutate()}
                      >
                        GC Bodies
                      </Button>
                    </HStack>
                    <HStack space={2} wrap className="mt-3">
                      <Button
                        size="xs"
                        variant="border"
                        disabled={selectedWorkspaceId == null}
                        isLoading={setRetentionMutation.isPending}
                        onClick={() => setRetentionMutation.mutate(25)}
                      >
                        Keep 25
                      </Button>
                      <Button
                        size="xs"
                        variant="border"
                        disabled={selectedWorkspaceId == null}
                        isLoading={setRetentionMutation.isPending}
                        onClick={() => setRetentionMutation.mutate(100)}
                      >
                        Keep 100
                      </Button>
                      <Button
                        size="xs"
                        variant="border"
                        disabled={selectedWorkspaceId == null}
                        isLoading={clearRetentionMutation.isPending}
                        onClick={() => clearRetentionMutation.mutate()}
                      >
                        Clear
                      </Button>
                    </HStack>
                    {gcBodiesMutation.data != null ? (
                      <div className="mt-3 text-xs text-text-subtle">
                        Deleted {gcBodiesMutation.data.deleted} files · Retained{" "}
                        {gcBodiesMutation.data.retained}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-xl border border-border-subtle bg-surface p-3">
                    <VStack space={2}>
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">
                          Backup
                        </div>
                        <div className="mt-1 text-xs leading-5 text-text-subtle">
                          Yaku native JSON only. Import replaces an existing workspace with the same
                          id.
                        </div>
                      </div>
                      <HStack space={2} wrap>
                        <Button
                          size="xs"
                          variant="border"
                          disabled={selectedWorkspaceId == null}
                          isLoading={exportBackupMutation.isPending}
                          onClick={() => exportBackupMutation.mutate()}
                        >
                          Export Workspace
                        </Button>
                        <Button
                          size="xs"
                          variant="border"
                          isLoading={importBackupMutation.isPending}
                          onClick={() => importBackupMutation.mutate()}
                        >
                          Import Backup
                        </Button>
                      </HStack>
                      {exportBackupMutation.data != null ? (
                        <div className="text-xs text-text-subtle">
                          Exported hash {exportBackupMutation.data.contentHash.slice(0, 12)}
                        </div>
                      ) : null}
                      {importBackupMutation.data != null ? (
                        <div className="text-xs text-text-subtle">
                          Imported {importBackupMutation.data.workspace.name}
                          {importBackupMutation.data.replacedExisting ? " and replaced existing data" : ""}
                        </div>
                      ) : null}
                    </VStack>
                  </div>
                </VStack>
              </Panel>

              <Panel title="Request Builder" subtitle="Create folders and seed sendable Yaku requests.">
                <VStack space={3}>
                  <Select
                    name="yaku-request-parent"
                    label="Parent Folder"
                    value={requestParentId}
                    options={[
                      { label: "Root", value: "__root__" },
                      ...folderNodes.map((folder) => ({ label: folder.name, value: folder.id })),
                    ]}
                    onChange={setRequestParentId}
                  />
                  <form
                    className="rounded-xl border border-border-subtle bg-surface p-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      createFolderMutation.mutate();
                    }}
                  >
                    <VStack space={2}>
                      <FieldLabel htmlFor="yaku-folder-name">New Folder</FieldLabel>
                      <input
                        id="yaku-folder-name"
                        value={folderName}
                        onChange={(event) => setFolderName(event.target.value)}
                        className={fieldClassName}
                      />
                      <Button
                        size="xs"
                        type="submit"
                        disabled={selectedWorkspaceId == null}
                        isLoading={createFolderMutation.isPending}
                      >
                        Create Folder
                      </Button>
                    </VStack>
                  </form>
                  <form
                    className="rounded-xl border border-border-subtle bg-surface p-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      createRequestMutation.mutate();
                    }}
                  >
                    <VStack space={2}>
                      <FieldLabel htmlFor="yaku-request-name">New Request</FieldLabel>
                      <input
                        id="yaku-request-name"
                        value={requestName}
                        onChange={(event) => setRequestName(event.target.value)}
                        className={fieldClassName}
                      />
                      <Select
                        name="yaku-request-protocol"
                        label="Protocol"
                        value={requestProtocol}
                        options={[
                          { label: "HTTP", value: "http" },
                          { label: "GraphQL", value: "graphql" },
                          { label: "SSE", value: "sse" },
                          { label: "WebSocket", value: "web_socket" },
                          { label: "gRPC", value: "grpc" },
                        ]}
                        onChange={(value) => setRequestProtocol(value as YakuProtocol)}
                        size="sm"
                      />
                      {requestProtocol === "http" || requestProtocol === "graphql" ? (
                        <VStack space={2}>
                          <input
                            value={requestUrl}
                            onChange={(event) => setRequestUrl(event.target.value)}
                            placeholder="https://example.com"
                            className={fieldClassName}
                          />
                          {requestProtocol === "http" ? (
                            <input
                              value={requestHttpMethod}
                              onChange={(event) => setRequestHttpMethod(event.target.value)}
                              placeholder="GET"
                              className={fieldClassName}
                            />
                          ) : null}
                          <textarea
                            value={requestHttpBody}
                            onChange={(event) => setRequestHttpBody(event.target.value)}
                            rows={4}
                            placeholder='{"query":"{ __typename }"}'
                            className={textareaClassName}
                          />
                          <PairListEditor
                            title="Headers"
                            pairs={requestHeaders}
                            setPairs={setRequestHeaders}
                            namePlaceholder="Header"
                            valuePlaceholder="Value"
                          />
                          <PairListEditor
                            title="Query"
                            pairs={requestQueryParams}
                            setPairs={setRequestQueryParams}
                            includeEnabled
                            namePlaceholder="Parameter"
                            valuePlaceholder="Value"
                          />
                          <label className="flex items-center gap-2 text-xs text-text-subtle">
                            <input
                              type="checkbox"
                              checked={requestFollowRedirects}
                              onChange={(event) => setRequestFollowRedirects(event.target.checked)}
                            />
                            Follow redirects
                          </label>
                          <input
                            value={requestTimeoutMs}
                            onChange={(event) => setRequestTimeoutMs(event.target.value)}
                            placeholder="Timeout ms"
                            className={fieldClassName}
                          />
                        </VStack>
                      ) : null}
                      {requestProtocol === "sse" ? (
                        <VStack space={2}>
                          <input
                            value={requestUrl}
                            onChange={(event) => setRequestUrl(event.target.value)}
                            placeholder="https://example.com/events"
                            className={fieldClassName}
                          />
                          <PairListEditor
                            title="Headers"
                            pairs={requestHeaders}
                            setPairs={setRequestHeaders}
                            namePlaceholder="Header"
                            valuePlaceholder="Value"
                          />
                          <PairListEditor
                            title="Query"
                            pairs={requestQueryParams}
                            setPairs={setRequestQueryParams}
                            includeEnabled
                            namePlaceholder="Parameter"
                            valuePlaceholder="Value"
                          />
                          <label className="flex items-center gap-2 text-xs text-text-subtle">
                            <input
                              type="checkbox"
                              checked={requestFollowRedirects}
                              onChange={(event) => setRequestFollowRedirects(event.target.checked)}
                            />
                            Follow redirects
                          </label>
                          <input
                            value={requestTimeoutMs}
                            onChange={(event) => setRequestTimeoutMs(event.target.value)}
                            placeholder="Timeout ms"
                            className={fieldClassName}
                          />
                        </VStack>
                      ) : null}
                      {requestProtocol === "web_socket" ? (
                        <VStack space={2}>
                          <input
                            value={requestUrl}
                            onChange={(event) => setRequestUrl(event.target.value)}
                            placeholder="ws://example.com/socket"
                            className={fieldClassName}
                          />
                          <PairListEditor
                            title="Headers"
                            pairs={requestHeaders}
                            setPairs={setRequestHeaders}
                            namePlaceholder="Header"
                            valuePlaceholder="Value"
                          />
                          <PairListEditor
                            title="Query"
                            pairs={requestQueryParams}
                            setPairs={setRequestQueryParams}
                            includeEnabled
                            namePlaceholder="Parameter"
                            valuePlaceholder="Value"
                          />
                          <textarea
                            value={requestWebSocketMessages}
                            onChange={(event) => setRequestWebSocketMessages(event.target.value)}
                            rows={4}
                            placeholder="hello"
                            className={textareaClassName}
                          />
                          <input
                            value={requestWebSocketMaxMessages}
                            onChange={(event) => setRequestWebSocketMaxMessages(event.target.value)}
                            placeholder="Max messages"
                            className={fieldClassName}
                          />
                          <input
                            value={requestTimeoutMs}
                            onChange={(event) => setRequestTimeoutMs(event.target.value)}
                            placeholder="Timeout ms"
                            className={fieldClassName}
                          />
                        </VStack>
                      ) : null}
                      {requestProtocol === "grpc" ? (
                        <VStack space={2}>
                          <input
                            value={requestUrl}
                            onChange={(event) => setRequestUrl(event.target.value)}
                            placeholder="http://localhost:50051"
                            className={fieldClassName}
                          />
                          <input
                            value={requestGrpcService}
                            onChange={(event) => setRequestGrpcService(event.target.value)}
                            placeholder="package.Service"
                            className={fieldClassName}
                          />
                          <input
                            value={requestGrpcMethod}
                            onChange={(event) => setRequestGrpcMethod(event.target.value)}
                            placeholder="Method"
                            className={fieldClassName}
                          />
                          <textarea
                            value={requestGrpcMessage}
                            onChange={(event) => setRequestGrpcMessage(event.target.value)}
                            rows={4}
                            placeholder='{"ping":"pong"}'
                            className={textareaClassName}
                          />
                          <PairListEditor
                            title="Metadata"
                            pairs={requestGrpcMetadata}
                            setPairs={setRequestGrpcMetadata}
                            namePlaceholder="Metadata"
                            valuePlaceholder="Value"
                          />
                          <label className="flex items-center gap-2 text-xs text-text-subtle">
                            <input
                              type="checkbox"
                              checked={requestGrpcUseReflection}
                              onChange={(event) => setRequestGrpcUseReflection(event.target.checked)}
                            />
                            Use reflection
                          </label>
                          <input
                            value={requestTimeoutMs}
                            onChange={(event) => setRequestTimeoutMs(event.target.value)}
                            placeholder="Timeout ms"
                            className={fieldClassName}
                          />
                        </VStack>
                      ) : null}
                      <Button
                        size="xs"
                        type="submit"
                        disabled={selectedWorkspaceId == null}
                        isLoading={createRequestMutation.isPending}
                      >
                        Create Request
                      </Button>
                    </VStack>
                  </form>
                </VStack>
              </Panel>

              <Panel title="Workspace Tree" subtitle="Nested folders and requests in the selected workspace.">
                {workspaceTree == null ? (
                  <EmptyCopy>Select a workspace to view its tree.</EmptyCopy>
                ) : workspaceTree.children == null || workspaceTree.children.length === 0 ? (
                  <EmptyCopy>No Yaku folders or requests found in this workspace.</EmptyCopy>
                ) : (
                  <Tree
                    ref={treeRef}
                    treeId={`yaku-workspace-${selectedWorkspaceId ?? "none"}`}
                    className="px-1"
                    root={workspaceTree}
                    getItemKey={(item) => `${item.id}::${item.kind}::${item.name}::${item.sortKey}`}
                    getContextMenu={handleWorkspaceTreeGetContextMenu}
                    getEditOptions={handleWorkspaceTreeGetEditOptions}
                    ItemInner={WorkspaceTreeItemInner}
                    ItemRightSlot={WorkspaceTreeItemRightSlot}
                    onActivate={handleWorkspaceTreeActivate}
                    onDragEnd={({ parent, children, items, insertAt }) => {
                      const nextChildren = [...children];
                      nextChildren.splice(insertAt, 0, ...items);
                      reorderTreeMutation.mutate({
                        parentId: parent.kind === "workspace_root" ? null : parent.id,
                        children: nextChildren as WorkspaceTreeItem[],
                      });
                    }}
                  />
                )}
              </Panel>
            </aside>

            <section className="flex flex-col gap-4">
              <Panel title="Folder Snapshot" subtitle="Selected folder and node actions.">
                {selectedFolderNode == null ? (
                  <EmptyCopy>Select a folder to manage it.</EmptyCopy>
                ) : (
                  <VStack space={3}>
                    <HStack justifyContent="between" alignItems="start" className="gap-3">
                      <VStack space={1}>
                        <div className="text-lg font-semibold text-text">{selectedFolderNode.name}</div>
                        <div className="text-xs uppercase tracking-[0.22em] text-text-subtlest">
                          Folder
                        </div>
                      </VStack>
                      <div className="rounded-full border border-border-subtle px-2 py-1 text-xs text-text-subtle">
                        {selectedFolderNode.id}
                      </div>
                    </HStack>
                    <form
                      className="rounded-xl border border-border-subtle bg-surface p-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        updateFolderMutation.mutate();
                      }}
                    >
                      <VStack space={2}>
                        <FieldLabel htmlFor="yaku-folder-edit-name">Folder Name</FieldLabel>
                        <input
                          id="yaku-folder-edit-name"
                          value={folderEditName}
                          onChange={(event) => setFolderEditName(event.target.value)}
                          className={fieldClassName}
                        />
                        <Button
                          size="xs"
                          type="submit"
                          isLoading={updateFolderMutation.isPending}
                        >
                          Save Folder
                        </Button>
                      </VStack>
                    </form>
                    <NodeMoveControls
                      label="Move Folder"
                      nodeId={selectedFolderNode.id}
                      currentParentId={selectedFolderNode.parentId}
                      currentFolderId={selectedFolderNode.id}
                      folderNodes={folderNodes}
                      value={folderMoveParentId}
                      setValue={setFolderMoveParentId}
                      isLoading={moveNodeMutation.isPending}
                      onMove={(parentId) =>
                        moveNodeMutation.mutate({
                          nodeId: selectedFolderNode.id,
                          parentId,
                        })
                      }
                    />
                    <HStack space={2} wrap>
                      <Button
                        size="xs"
                        variant="border"
                        onClick={() => setRequestParentId(selectedFolderNode.id)}
                      >
                        Use As Parent
                      </Button>
                      <Button
                        size="xs"
                        variant="border"
                        color="danger"
                        isLoading={deleteFolderNodeMutation.isPending}
                        onClick={() => deleteFolderNodeMutation.mutate()}
                      >
                        Delete Folder
                      </Button>
                    </HStack>
                  </VStack>
                )}
              </Panel>

              <Panel title="Request Snapshot" subtitle="Resolved from the Yaku request record before execution.">
                {requestQuery.error ? (
                  <FormattedError>{String(requestQuery.error)}</FormattedError>
                ) : requestQuery.data == null ? (
                  <EmptyCopy>Select a request to inspect its config.</EmptyCopy>
                ) : (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      updateRequestMutation.mutate("structured");
                    }}
                  >
                    <VStack space={3}>
                      <HStack justifyContent="between" alignItems="start" className="gap-3">
                        <VStack space={1}>
                          <div className="text-lg font-semibold text-text">{requestQuery.data.name}</div>
                          <div className="text-xs uppercase tracking-[0.22em] text-text-subtlest">
                            {requestQuery.data.protocol}
                          </div>
                        </VStack>
                        <div className="rounded-full border border-border-subtle px-2 py-1 text-xs text-text-subtle">
                          {requestQuery.data.id}
                        </div>
                      </HStack>
                      <RequestConfigSummary
                        protocol={requestQuery.data.protocol}
                        config={requestQuery.data.config}
                      />
                      <input
                        value={requestEditName}
                        onChange={(event) => setRequestEditName(event.target.value)}
                        className={fieldClassName}
                      />
                      <input
                        value={requestEditDescription}
                        onChange={(event) => setRequestEditDescription(event.target.value)}
                        placeholder="Description"
                        className={fieldClassName}
                      />
                      <RequestStructuredEditor
                        protocol={requestQuery.data.protocol}
                        url={requestEditUrl}
                        setUrl={setRequestEditUrl}
                        httpMethod={requestEditHttpMethod}
                        setHttpMethod={setRequestEditHttpMethod}
                        httpBody={requestEditHttpBody}
                        setHttpBody={setRequestEditHttpBody}
                        headers={requestEditHeaders}
                        setHeaders={setRequestEditHeaders}
                        query={requestEditQueryParams}
                        setQuery={setRequestEditQueryParams}
                        followRedirects={requestEditFollowRedirects}
                        setFollowRedirects={setRequestEditFollowRedirects}
                        timeoutMs={requestEditTimeoutMs}
                        setTimeoutMs={setRequestEditTimeoutMs}
                        grpcService={requestEditGrpcService}
                        setGrpcService={setRequestEditGrpcService}
                        grpcMethod={requestEditGrpcMethod}
                        setGrpcMethod={setRequestEditGrpcMethod}
                        grpcMessage={requestEditGrpcMessage}
                        setGrpcMessage={setRequestEditGrpcMessage}
                        grpcMetadata={requestEditGrpcMetadata}
                        setGrpcMetadata={setRequestEditGrpcMetadata}
                        grpcUseReflection={requestEditGrpcUseReflection}
                        setGrpcUseReflection={setRequestEditGrpcUseReflection}
                        webSocketMessages={requestEditWebSocketMessages}
                        setWebSocketMessages={setRequestEditWebSocketMessages}
                        webSocketMaxMessages={requestEditWebSocketMaxMessages}
                        setWebSocketMaxMessages={setRequestEditWebSocketMaxMessages}
                      />
                      <NodeMoveControls
                        label="Move Request"
                        nodeId={selectedRequestNode?.id ?? ""}
                        currentParentId={selectedRequestNode?.parentId}
                        currentFolderId={selectedRequestNode?.id}
                        folderNodes={folderNodes}
                        value={requestMoveParentId}
                        setValue={setRequestMoveParentId}
                        isLoading={moveNodeMutation.isPending}
                        onMove={(parentId) =>
                          moveNodeMutation.mutate({
                            nodeId: selectedRequestNode!.id,
                            parentId,
                          })
                        }
                      />
                      <div className="rounded-xl border border-border-subtle bg-surface p-3">
                        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-text-subtlest">
                          Raw JSON Override
                        </div>
                        <textarea
                          value={requestConfigText}
                          onChange={(event) => setRequestConfigText(event.target.value)}
                          rows={8}
                          className={textareaClassName}
                        />
                        <div className="mt-2 text-xs leading-5 text-text-subtle">
                          Use this only for fields not represented above. Saving with the primary
                          button uses the structured editor.
                        </div>
                      </div>
                      <HStack space={2} wrap>
                        <Button
                          size="xs"
                          type="submit"
                          isLoading={updateRequestMutation.isPending}
                        >
                          Save Request
                        </Button>
                        <Button
                          size="xs"
                          type="button"
                          variant="border"
                          isLoading={updateRequestMutation.isPending}
                          onClick={() => updateRequestMutation.mutate("raw")}
                        >
                          Apply Raw JSON
                        </Button>
                        <Button
                          size="xs"
                          type="button"
                          variant="border"
                          color="danger"
                          disabled={selectedRequestNode == null}
                          isLoading={deleteRequestNodeMutation.isPending}
                          onClick={() => deleteRequestNodeMutation.mutate()}
                        >
                          Delete Request
                        </Button>
                      </HStack>
                    </VStack>
                  </form>
                )}
              </Panel>

              <Panel title="Run History" subtitle="Newest runs for the selected request.">
                {runsQuery.error ? (
                  <FormattedError>{String(runsQuery.error)}</FormattedError>
                ) : runs.length === 0 ? (
                  <EmptyCopy>Send the selected request to create the first Yaku run.</EmptyCopy>
                ) : (
                  <div className="space-y-2">
                    {runs.map((run) => {
                      const isActive = run.id === selectedRunId;
                      return (
                        <button
                          key={run.id}
                          type="button"
                          onClick={() => setSearch({ runId: run.id })}
                          className={classNames(
                            "grid w-full grid-cols-[1fr_auto] gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                            isActive
                              ? "border-border-focus bg-surface text-text"
                              : "border-border-subtle bg-surface-highlight/40 text-text-subtle hover:border-border hover:text-text",
                          )}
                        >
                          <VStack space={1}>
                            <div className="font-medium">
                              {run.state}
                              {run.statusCode != null && ` · ${run.statusCode}`}
                            </div>
                            <div className="truncate text-xs text-text-subtlest">{run.id}</div>
                          </VStack>
                          <div className="text-right text-xs text-text-subtle">
                            {new Date(run.startedAt).toLocaleString()}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Panel>
            </section>

            <section className="flex flex-col gap-4">
              <Panel title="Event Timeline" subtitle="Unified run events emitted by the Yaku engine.">
                <VStack space={3}>
                  <Select
                    name="yaku-event-kind"
                    label="Filter"
                    value={eventKind}
                    options={YAKU_RUN_EVENT_KIND_OPTIONS}
                    onChange={(value) => setEventKind(value as "all" | YakuRunEventKind)}
                  />
                  {runEventsQuery.error ? (
                    <FormattedError>{String(runEventsQuery.error)}</FormattedError>
                  ) : (runEventsQuery.data?.items.length ?? 0) === 0 ? (
                    <EmptyCopy>No events available for this run and filter.</EmptyCopy>
                  ) : (
                    <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
                      {runEventsQuery.data?.items.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-xl border border-border-subtle bg-surface px-3 py-3"
                        >
                          <HStack justifyContent="between" alignItems="start" className="gap-3">
                            <div className="font-medium text-text">{event.kind}</div>
                            <div className="text-xs text-text-subtlest">#{event.sequence}</div>
                          </HStack>
                          <div className="mt-1 text-xs text-text-subtlest">
                            {new Date(event.createdAt).toLocaleString()}
                          </div>
                          <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-text-subtle">
                            {JSON.stringify(event.data, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </VStack>
              </Panel>

              <Panel title="Captured Bodies" subtitle="Response/message payloads stored by the Yaku body store.">
                <VStack space={3}>
                  <Select
                    name="yaku-run-body"
                    label="Body"
                    value={selectedBodyId || "__none__"}
                    options={
                      runBodies.length === 0
                        ? [{ label: "No Bodies", value: "__none__" }]
                        : runBodies.map((body) => ({
                            label: `${body.bodyRole} · ${body.contentType ?? body.storageKind}`,
                            value: body.id,
                          }))
                    }
                    onChange={(value) => setSelectedBodyId(value === "__none__" ? "" : value)}
                  />
                  {runBodyBytesQuery.error ? (
                    <FormattedError>{String(runBodyBytesQuery.error)}</FormattedError>
                  ) : selectedBody == null ? (
                    <EmptyCopy>No persisted body for this run.</EmptyCopy>
                  ) : (
                    <VStack space={2}>
                      <div className="grid gap-2 md:grid-cols-3">
                        <BodyMeta label="Role" value={selectedBody.bodyRole} />
                        <BodyMeta
                          label="Bytes"
                          value={selectedBody.byteLength.toLocaleString()}
                        />
                        <BodyMeta
                          label="Storage"
                          value={selectedBody.storageKind}
                        />
                      </div>
                      <pre className="max-h-[320px] overflow-auto rounded-xl border border-border-subtle bg-surface p-3 text-xs text-text-subtle">
                        {formattedBodyText || "Body is empty."}
                      </pre>
                    </VStack>
                  )}
                </VStack>
              </Panel>
            </section>
          </div>
        )}

        {startRunMutation.error ? (
          <FormattedError>{String(startRunMutation.error)}</FormattedError>
        ) : null}
        {cancelRunMutation.error ? (
          <FormattedError>{String(cancelRunMutation.error)}</FormattedError>
        ) : null}
        <MutationErrors
          errors={[
            createWorkspaceMutation.error,
            createEnvironmentMutation.error,
            updateEnvironmentMutation.error,
            deleteEnvironmentMutation.error,
            createFolderMutation.error,
            createRequestMutation.error,
            updateRequestMutation.error,
            moveNodeMutation.error,
            renameTreeNodeMutation.error,
            reorderTreeMutation.error,
            deleteRequestNodeMutation.error,
            deleteFolderNodeMutation.error,
            setRetentionMutation.error,
            clearRetentionMutation.error,
            gcBodiesMutation.error,
            exportBackupMutation.error,
            importBackupMutation.error,
          ]}
        />
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-highlight/35 p-4">
      <VStack space={3}>
        <VStack space={1}>
          <Heading level={3}>{title}</Heading>
          <p className="text-sm text-text-subtle">{subtitle}</p>
        </VStack>
        {children}
      </VStack>
    </section>
  );
}

function StatCard({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "success" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface px-3 py-3">
      <div className="text-xs uppercase tracking-[0.18em] text-text-subtlest">{label}</div>
      <div
        className={classNames(
          "mt-2 text-2xl font-semibold",
          accent === "default" && "text-text",
          accent === "success" && "text-success",
          accent === "danger" && "text-danger",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function BodyMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface px-3 py-2">
      <div className="text-xs uppercase tracking-[0.18em] text-text-subtlest">{label}</div>
      <div className="mt-1 truncate text-sm text-text">{value}</div>
    </div>
  );
}

function EmptyCopy({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border-subtle bg-surface px-3 py-6 text-center text-sm text-text-subtle">
      {children}
    </div>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs uppercase tracking-[0.18em] text-text-subtlest">
      {children}
    </label>
  );
}

function MutationErrors({ errors }: { errors: unknown[] }) {
  const error = errors.find(Boolean);
  return error ? <FormattedError>{String(error)}</FormattedError> : null;
}

const fieldClassName =
  "min-h-sm w-full rounded-md border border-border-subtle bg-surface px-2 text-xs font-mono text-text outline-none focus:border-border-focus placeholder:text-placeholder";

const textareaClassName =
  "w-full resize-y rounded-md border border-border-subtle bg-surface p-2 text-xs font-mono text-text outline-none focus:border-border-focus";

function selectOptions<T extends { id: string }>(
  items: T[],
  label: (item: T) => string,
) {
  return items.map((item) => ({ label: label(item), value: item.id }));
}

function resolveSelectedId<T extends { id: string }>(items: T[], requestedId?: string) {
  if (requestedId != null && items.some((item) => item.id === requestedId)) {
    return requestedId;
  }
  return items[0]?.id;
}

function resolveSelectedRequestId(
  items: Array<YakuRequestNodePageItem & { requestId: string }>,
  requestedId?: string,
) {
  if (requestedId != null && items.some((item) => item.requestId === requestedId)) {
    return requestedId;
  }
  return items[0]?.requestId;
}

function preferredBodyId(bodies: YakuRunBody[]) {
  return bodies.find((body) => body.bodyRole === "response")?.id ?? bodies[0]?.id;
}

function parseJsonObject(input: string, label: string): Record<string, unknown> {
  const parsed = JSON.parse(input) as unknown;
  if (parsed == null || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

function buildRequestConfigDraft(input: {
  protocol: YakuProtocol;
  url: string;
  httpMethod: string;
  httpBody: string;
  headers: ConfigPair[];
  query: ConfigPair[];
  followRedirects: boolean;
  timeoutMs: string;
  grpcService: string;
  grpcMethod: string;
  grpcMessage: string;
  grpcMetadata: ConfigPair[];
  grpcUseReflection: boolean;
  webSocketMessages: string;
  webSocketMaxMessages: string;
}): Record<string, unknown> {
  const timeout = parseOptionalInteger(input.timeoutMs);
  const trimmedUrl = input.url.trim();
  if (input.protocol === "grpc") {
    return {
      url: trimmedUrl,
      service: input.grpcService.trim(),
      method: input.grpcMethod.trim(),
      metadata: pairsToHeaders(input.grpcMetadata),
      message: input.grpcMessage.trim() === "" ? null : input.grpcMessage,
      protoFiles: [],
      useReflection: input.grpcUseReflection,
      timeoutMs: timeout ?? 30_000,
    };
  }

  if (input.protocol === "web_socket") {
    return {
      url: trimmedUrl,
      headers: pairsToHeaders(input.headers),
      query: pairsToQueryParams(input.query),
      messages: splitLines(input.webSocketMessages),
      maxMessages: parseOptionalInteger(input.webSocketMaxMessages) ?? 1,
      timeoutMs: timeout ?? 30_000,
    };
  }

  if (input.protocol === "sse") {
    return {
      url: trimmedUrl,
      headers: pairsToHeaders(input.headers),
      query: pairsToQueryParams(input.query),
      followRedirects: input.followRedirects,
      timeoutMs: timeout,
    };
  }

  return {
    method: input.protocol === "graphql" ? "POST" : input.httpMethod.trim() || "GET",
    url: trimmedUrl,
    headers: pairsToHeaders(input.headers),
    query: pairsToQueryParams(input.query),
    body: input.httpBody.trim() === "" ? null : input.httpBody,
    followRedirects: input.followRedirects,
    timeoutMs: timeout,
  };
}

function RequestStructuredEditor({
  protocol,
  url,
  setUrl,
  httpMethod,
  setHttpMethod,
  httpBody,
  setHttpBody,
  headers,
  setHeaders,
  query,
  setQuery,
  followRedirects,
  setFollowRedirects,
  timeoutMs,
  setTimeoutMs,
  grpcService,
  setGrpcService,
  grpcMethod,
  setGrpcMethod,
  grpcMessage,
  setGrpcMessage,
  grpcMetadata,
  setGrpcMetadata,
  grpcUseReflection,
  setGrpcUseReflection,
  webSocketMessages,
  setWebSocketMessages,
  webSocketMaxMessages,
  setWebSocketMaxMessages,
}: {
  protocol: YakuProtocol;
  url: string;
  setUrl: (value: string) => void;
  httpMethod: string;
  setHttpMethod: (value: string) => void;
  httpBody: string;
  setHttpBody: (value: string) => void;
  headers: ConfigPair[];
  setHeaders: (pairs: ConfigPair[]) => void;
  query: ConfigPair[];
  setQuery: (pairs: ConfigPair[]) => void;
  followRedirects: boolean;
  setFollowRedirects: (value: boolean) => void;
  timeoutMs: string;
  setTimeoutMs: (value: string) => void;
  grpcService: string;
  setGrpcService: (value: string) => void;
  grpcMethod: string;
  setGrpcMethod: (value: string) => void;
  grpcMessage: string;
  setGrpcMessage: (value: string) => void;
  grpcMetadata: ConfigPair[];
  setGrpcMetadata: (pairs: ConfigPair[]) => void;
  grpcUseReflection: boolean;
  setGrpcUseReflection: (value: boolean) => void;
  webSocketMessages: string;
  setWebSocketMessages: (value: string) => void;
  webSocketMaxMessages: string;
  setWebSocketMaxMessages: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-text-subtlest">
        Structured Config
      </div>
      <VStack space={2}>
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={protocol === "web_socket" ? "ws://example.com/socket" : "https://example.com"}
          className={fieldClassName}
        />
        {protocol === "http" || protocol === "graphql" ? (
          <>
            {protocol === "http" ? (
              <input
                value={httpMethod}
                onChange={(event) => setHttpMethod(event.target.value)}
                placeholder="GET"
                className={fieldClassName}
              />
            ) : null}
            <textarea
              value={httpBody}
              onChange={(event) => setHttpBody(event.target.value)}
              rows={5}
              placeholder={protocol === "graphql" ? '{"query":"{ __typename }"}' : "Request body"}
              className={textareaClassName}
            />
            <PairListEditor
              title="Headers"
              pairs={headers}
              setPairs={setHeaders}
              namePlaceholder="Header"
              valuePlaceholder="Value"
            />
            <PairListEditor
              title="Query"
              pairs={query}
              setPairs={setQuery}
              includeEnabled
              namePlaceholder="Parameter"
              valuePlaceholder="Value"
            />
            <CheckboxField checked={followRedirects} onChange={setFollowRedirects}>
              Follow redirects
            </CheckboxField>
            <input
              value={timeoutMs}
              onChange={(event) => setTimeoutMs(event.target.value)}
              placeholder="Timeout ms"
              className={fieldClassName}
            />
          </>
        ) : null}
        {protocol === "sse" ? (
          <>
            <PairListEditor
              title="Headers"
              pairs={headers}
              setPairs={setHeaders}
              namePlaceholder="Header"
              valuePlaceholder="Value"
            />
            <PairListEditor
              title="Query"
              pairs={query}
              setPairs={setQuery}
              includeEnabled
              namePlaceholder="Parameter"
              valuePlaceholder="Value"
            />
            <CheckboxField checked={followRedirects} onChange={setFollowRedirects}>
              Follow redirects
            </CheckboxField>
            <input
              value={timeoutMs}
              onChange={(event) => setTimeoutMs(event.target.value)}
              placeholder="Timeout ms"
              className={fieldClassName}
            />
          </>
        ) : null}
        {protocol === "web_socket" ? (
          <>
            <PairListEditor
              title="Headers"
              pairs={headers}
              setPairs={setHeaders}
              namePlaceholder="Header"
              valuePlaceholder="Value"
            />
            <PairListEditor
              title="Query"
              pairs={query}
              setPairs={setQuery}
              includeEnabled
              namePlaceholder="Parameter"
              valuePlaceholder="Value"
            />
            <textarea
              value={webSocketMessages}
              onChange={(event) => setWebSocketMessages(event.target.value)}
              rows={5}
              placeholder="One message per line"
              className={textareaClassName}
            />
            <input
              value={webSocketMaxMessages}
              onChange={(event) => setWebSocketMaxMessages(event.target.value)}
              placeholder="Max messages"
              className={fieldClassName}
            />
            <input
              value={timeoutMs}
              onChange={(event) => setTimeoutMs(event.target.value)}
              placeholder="Timeout ms"
              className={fieldClassName}
            />
          </>
        ) : null}
        {protocol === "grpc" ? (
          <>
            <input
              value={grpcService}
              onChange={(event) => setGrpcService(event.target.value)}
              placeholder="package.Service"
              className={fieldClassName}
            />
            <input
              value={grpcMethod}
              onChange={(event) => setGrpcMethod(event.target.value)}
              placeholder="Method"
              className={fieldClassName}
            />
            <textarea
              value={grpcMessage}
              onChange={(event) => setGrpcMessage(event.target.value)}
              rows={5}
              placeholder='{"ping":"pong"}'
              className={textareaClassName}
            />
            <PairListEditor
              title="Metadata"
              pairs={grpcMetadata}
              setPairs={setGrpcMetadata}
              namePlaceholder="Metadata"
              valuePlaceholder="Value"
            />
            <CheckboxField checked={grpcUseReflection} onChange={setGrpcUseReflection}>
              Use reflection
            </CheckboxField>
            <input
              value={timeoutMs}
              onChange={(event) => setTimeoutMs(event.target.value)}
              placeholder="Timeout ms"
              className={fieldClassName}
            />
          </>
        ) : null}
      </VStack>
    </div>
  );
}

function CheckboxField({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-subtle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {children}
    </label>
  );
}

function NodeMoveControls({
  label,
  nodeId,
  currentParentId,
  currentFolderId,
  folderNodes,
  value,
  setValue,
  onMove,
  isLoading = false,
}: {
  label: string;
  nodeId: string;
  currentParentId: string | null | undefined;
  currentFolderId?: string;
  folderNodes: YakuRequestNodePageItem[];
  value: string;
  setValue: (value: string) => void;
  onMove: (parentId: string | null) => void;
  isLoading?: boolean;
}) {
  const excludedFolderIds = useMemo(() => {
    if (currentFolderId == null) return new Set<string>();
    const descendants = collectFolderDescendantIds(folderNodes, currentFolderId);
    return new Set([currentFolderId, ...descendants]);
  }, [currentFolderId, folderNodes]);

  const options = useMemo(
    () => [
      { label: "Root", value: "__root__" },
      ...folderNodes
        .filter((folder) => !excludedFolderIds.has(folder.id))
        .map((folder) => ({ label: folder.name, value: folder.id })),
    ],
    [excludedFolderIds, folderNodes],
  );

  const currentParentLabel =
    currentParentId == null
      ? "Root"
      : folderNodes.find((folder) => folder.id === currentParentId)?.name ?? currentParentId;

  const hasSelectedTarget = options.some((option) => option.value === value);
  const selectedValue = hasSelectedTarget ? value : "__root__";
  const isSameParent = (currentParentId ?? "__root__") === selectedValue;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-text-subtlest">{label}</div>
      <div className="mb-3 text-xs text-text-subtle">Current parent: {currentParentLabel}</div>
      <Select
        name={`${label}-target-${nodeId}`}
        label="Target"
        value={selectedValue}
        options={options}
        onChange={setValue}
        size="sm"
      />
      <HStack space={2} wrap className="mt-3">
        <Button
          size="xs"
          variant="border"
          disabled={isSameParent}
          isLoading={isLoading}
          onClick={() => onMove(selectedValue === "__root__" ? null : selectedValue)}
        >
          Move
        </Button>
      </HStack>
    </div>
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

function PairListEditor({
  title,
  pairs,
  setPairs,
  includeEnabled = false,
  namePlaceholder,
  valuePlaceholder,
}: {
  title: string;
  pairs: ConfigPair[];
  setPairs: (pairs: ConfigPair[]) => void;
  includeEnabled?: boolean;
  namePlaceholder: string;
  valuePlaceholder: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <HStack justifyContent="between" alignItems="center" className="gap-2">
        <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">{title}</div>
        <Button
          size="2xs"
          variant="border"
          onClick={() => setPairs([...pairs, createConfigPair()])}
        >
          Add
        </Button>
      </HStack>
      <div className="mt-3 space-y-2">
        {pairs.length === 0 ? (
          <EmptyCopy>No rows yet.</EmptyCopy>
        ) : (
          pairs.map((pair, index) => (
            <div
              key={pair.id}
              className="grid gap-2 rounded-lg border border-border-subtle bg-surface-highlight/35 p-2 md:grid-cols-[1fr_1fr_auto]"
            >
              <input
                value={pair.name}
                onChange={(event) =>
                  updateConfigPair(pairs, setPairs, pair.id, { name: event.target.value })
                }
                placeholder={namePlaceholder}
                className={fieldClassName}
              />
              <div className="flex gap-2 max-md:flex-col">
                <input
                  value={pair.value}
                  onChange={(event) =>
                    updateConfigPair(pairs, setPairs, pair.id, { value: event.target.value })
                  }
                  placeholder={valuePlaceholder}
                  className={fieldClassName}
                />
                {includeEnabled ? (
                  <label className="flex items-center gap-2 whitespace-nowrap text-xs text-text-subtle">
                    <input
                      type="checkbox"
                      checked={pair.enabled !== false}
                      onChange={(event) =>
                        updateConfigPair(pairs, setPairs, pair.id, {
                          enabled: event.target.checked,
                        })
                      }
                    />
                    Enabled
                  </label>
                ) : null}
              </div>
              <Button
                size="2xs"
                variant="border"
                color="danger"
                onClick={() => setPairs(pairs.filter((_, currentIndex) => currentIndex !== index))}
              >
                Remove
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RequestConfigSummary({
  protocol,
  config,
}: {
  protocol: YakuProtocol;
  config: Record<string, unknown>;
}) {
  const entries = summarizeRequestConfig(protocol, config);
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-text-subtlest">
        Protocol Summary
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.label} className="rounded-lg border border-border-subtle bg-surface-highlight/40 px-2 py-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">
              {entry.label}
            </div>
            <div className="mt-1 break-words text-xs text-text">{entry.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function summarizeRequestConfig(protocol: YakuProtocol, config: Record<string, unknown>) {
  const url = stringOrEmpty(config.url);
  if (protocol === "grpc") {
    return [
      { label: "URL", value: url || "unset" },
      { label: "Service", value: stringOrEmpty(config.service) || "unset" },
      { label: "Method", value: stringOrEmpty(config.method) || "unset" },
      { label: "Reflection", value: booleanString(config.useReflection) },
      { label: "Timeout", value: numberString(config.timeoutMs) },
    ];
  }
  if (protocol === "web_socket") {
    return [
      { label: "URL", value: url || "unset" },
      { label: "Messages", value: arrayLengthString(config.messages) },
      { label: "Max Messages", value: numberString(config.maxMessages) },
      { label: "Timeout", value: numberString(config.timeoutMs) },
    ];
  }
  if (protocol === "sse") {
    return [
      { label: "URL", value: url || "unset" },
      { label: "Follow Redirects", value: booleanString(config.followRedirects) },
      { label: "Timeout", value: numberString(config.timeoutMs) },
    ];
  }
  return [
    { label: "Method", value: stringOrEmpty(config.method) || "unset" },
    { label: "URL", value: url || "unset" },
    { label: "Follow Redirects", value: booleanString(config.followRedirects) },
    { label: "Timeout", value: numberString(config.timeoutMs) },
    { label: "Body", value: config.body == null ? "empty" : "set" },
  ];
}

function parseOptionalInteger(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    throw new Error(`Invalid integer: ${value}`);
  }
  return parsed;
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}

function booleanString(value: unknown) {
  return value === true ? "true" : value === false ? "false" : "unset";
}

function numberString(value: unknown) {
  return typeof value === "number" ? value.toLocaleString() : "unset";
}

function arrayLengthString(value: unknown) {
  return Array.isArray(value) ? `${value.length} items` : "unset";
}

function buildWorkspaceTree(
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

function collectFolderDescendantIds(nodes: YakuRequestNodePageItem[], folderId: string) {
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

function draftFromRequestConfig(protocol: YakuProtocol, config: Record<string, unknown>) {
  return {
    url: stringOrEmpty(config.url),
    httpMethod: stringOrEmpty(config.method) || (protocol === "graphql" ? "POST" : "GET"),
    httpBody: typeof config.body === "string" ? config.body : "",
    headers: pairsFromHeaders(config.headers),
    query: pairsFromQuery(config.query),
    followRedirects: config.followRedirects !== false,
    timeoutMs: typeof config.timeoutMs === "number" ? String(config.timeoutMs) : "",
    grpcService: stringOrEmpty(config.service),
    grpcMethod: stringOrEmpty(config.method),
    grpcMessage: typeof config.message === "string" ? config.message : "",
    grpcMetadata: pairsFromHeaders(config.metadata),
    grpcUseReflection: config.useReflection !== false,
    webSocketMessages: Array.isArray(config.messages)
      ? config.messages.filter((message) => typeof message === "string").join("\n")
      : "",
    webSocketMaxMessages: typeof config.maxMessages === "number" ? String(config.maxMessages) : "1",
  };
}

function createConfigPair(pair: Partial<ConfigPair> = {}) {
  return {
    id: pair.id ?? `pair_${Math.random().toString(16).slice(2)}`,
    name: pair.name ?? "",
    value: pair.value ?? "",
    enabled: pair.enabled ?? true,
  };
}

function updateConfigPair(
  pairs: ConfigPair[],
  setPairs: (pairs: ConfigPair[]) => void,
  id: string,
  patch: Partial<ConfigPair>,
) {
  setPairs(
    pairs.map((pair) =>
      pair.id === id ? { ...pair, ...patch, enabled: patch.enabled ?? pair.enabled } : pair,
    ),
  );
}

function pairsToHeaders(pairs: ConfigPair[]) {
  return pairs
    .map((pair) => ({ name: pair.name.trim(), value: pair.value }))
    .filter((pair) => pair.name !== "");
}

function pairsToQueryParams(pairs: ConfigPair[]) {
  return pairs
    .map((pair) => ({
      name: pair.name.trim(),
      value: pair.value,
      enabled: pair.enabled !== false,
    }))
    .filter((pair) => pair.name !== "");
}

function pairsFromHeaders(value: unknown): ConfigPair[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => item != null && typeof item === "object")
    .map((item) =>
      createConfigPair({
        name: stringOrEmpty(item.name),
        value: stringOrEmpty(item.value),
      }),
    );
}

function pairsFromQuery(value: unknown): ConfigPair[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => item != null && typeof item === "object")
    .map((item) =>
      createConfigPair({
        name: stringOrEmpty(item.name),
        value: stringOrEmpty(item.value),
        enabled: item.enabled !== false,
      }),
    );
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function slugFilePart(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "workspace";
}
