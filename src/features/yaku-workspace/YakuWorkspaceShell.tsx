import classNames from "classnames";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "../../components/core/Button";
import type { DropdownItem } from "../../components/core/Dropdown";
import { FormattedError } from "../../components/core/FormattedError";
import { Heading } from "../../components/core/Heading";
import { HStack, VStack } from "../../components/core/Stacks";
import type { TreeHandle, TreeProps } from "../../components/core/tree/Tree";
import {
  type YakuProtocol,
  type YakuRunBody,
  type YakuRunEventKind,
  type YakuRunLifecycleEvent,
  yakuEventNames,
} from "../../lib/yaku-client";
import { useListenToTauriEvent } from "../../hooks/useListenToTauriEvent";
import { YakuBodyViewer } from "./BodyViewer";
import { FolderSnapshotPanel } from "./FolderSnapshotPanel";
import { NodeMoveControls } from "./NodeMoveControls";
import { RequestBuilderPanel } from "./RequestBuilderPanel";
import { RequestSnapshotPanel } from "./RequestSnapshotPanel";
import { RunEventTimelinePanel, RunHistoryPanel } from "./RunPanels";
import { WorkspaceContextPanel } from "./WorkspaceContextPanel";
import { WorkspacePanel as Panel } from "./WorkspacePanels";
import { WorkspaceTreePanel } from "./WorkspaceTreePanel";
import { useYakuWorkspaceMutations } from "./useYakuWorkspaceMutations";
import { useYakuWorkspaceQueries } from "./useYakuWorkspaceQueries";
import { draftFromRequestConfig } from "./requestConfig";
import type { ConfigPair, WorkspaceTreeItem, YakuWorkspaceSearch } from "./types";

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

  const treeRef = useRef<TreeHandle>(null);
  const {
    workspacesQuery,
    workspaces,
    selectedWorkspaceId,
    selectedWorkspace,
    environmentsQuery,
    environments,
    selectedEnvironmentId,
    selectedEnvironment,
    retentionQuery,
    requestsQuery,
    requestNodes,
    folderNodes,
    workspaceTree,
    selectedFolderNode,
    selectedRequestId,
    selectedRequestNode,
    requestQuery,
    runsQuery,
    runs,
    selectedRunId,
    selectedRunIsRunning,
    runEventsQuery,
    runBodies,
    runBodyBytesQuery,
  } = useYakuWorkspaceQueries({
    search,
    eventKind,
    selectedBodyId,
  });

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

  const {
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
  } = useYakuWorkspaceMutations({
    selectedWorkspaceId,
    selectedWorkspace,
    selectedEnvironmentId,
    selectedRequestId,
    selectedRunId,
    selectedFolderNode,
    selectedRequestNode,
    loadedRequest: requestQuery.data,
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
  });

  useListenToTauriEvent<YakuRunLifecycleEvent>(yakuEventNames.runLifecycle, ({ payload }) => {
    void invalidateRunData(payload.runId, payload.requestId);
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
            onSelect: () => startTreeRequestMutation.mutate(first),
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
        onSelect: () => deleteTreeNodeMutation.mutate(first),
      },
    ];
    return menuItems.filter((item): item is DropdownItem => item != null);
  }, [
    deleteTreeNodeMutation,
    handleWorkspaceTreeActivate,
    renameTreeNodeMutation,
    startTreeRequestMutation,
  ]);

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
              <WorkspaceContextPanel
                workspaces={workspaces}
                environments={environments}
                selectedWorkspaceId={selectedWorkspaceId}
                selectedEnvironmentId={selectedEnvironmentId}
                workspaceName={workspaceName}
                setWorkspaceName={setWorkspaceName}
                environmentName={environmentName}
                setEnvironmentName={setEnvironmentName}
                environmentVariablesText={environmentVariablesText}
                setEnvironmentVariablesText={setEnvironmentVariablesText}
                retention={retentionQuery.data}
                gcReport={gcBodiesMutation.data}
                exportResult={exportBackupMutation.data ?? undefined}
                importResult={importBackupMutation.data ?? undefined}
                isCreatingWorkspace={createWorkspaceMutation.isPending}
                isCreatingEnvironment={createEnvironmentMutation.isPending}
                isUpdatingEnvironment={updateEnvironmentMutation.isPending}
                isDeletingEnvironment={deleteEnvironmentMutation.isPending}
                isSettingRetention={setRetentionMutation.isPending}
                isClearingRetention={clearRetentionMutation.isPending}
                isGcBodies={gcBodiesMutation.isPending}
                isExportingBackup={exportBackupMutation.isPending}
                isImportingBackup={importBackupMutation.isPending}
                onCreateWorkspace={() => createWorkspaceMutation.mutate()}
                onSelectWorkspace={(workspaceId) =>
                  setSearch({
                    workspaceId,
                    folderId: undefined,
                    requestId: undefined,
                    runId: undefined,
                    environmentId: undefined,
                  })
                }
                onSelectEnvironment={(environmentId) => setSearch({ environmentId })}
                onCreateEnvironment={() => createEnvironmentMutation.mutate()}
                onUpdateEnvironment={() => updateEnvironmentMutation.mutate()}
                onDeleteEnvironment={() => deleteEnvironmentMutation.mutate()}
                onSetRetention={(limit) => setRetentionMutation.mutate(limit)}
                onClearRetention={() => clearRetentionMutation.mutate()}
                onGcBodies={() => gcBodiesMutation.mutate()}
                onExportBackup={() => exportBackupMutation.mutate()}
                onImportBackup={() => importBackupMutation.mutate()}
              />

              <RequestBuilderPanel
                workspaceId={selectedWorkspaceId}
                folderNodes={folderNodes}
                parentId={requestParentId}
                setParentId={setRequestParentId}
                folderName={folderName}
                setFolderName={setFolderName}
                requestName={requestName}
                setRequestName={setRequestName}
                requestProtocol={requestProtocol}
                setRequestProtocol={setRequestProtocol}
                requestUrl={requestUrl}
                setRequestUrl={setRequestUrl}
                requestHttpMethod={requestHttpMethod}
                setRequestHttpMethod={setRequestHttpMethod}
                requestHttpBody={requestHttpBody}
                setRequestHttpBody={setRequestHttpBody}
                requestHeaders={requestHeaders}
                setRequestHeaders={setRequestHeaders}
                requestQueryParams={requestQueryParams}
                setRequestQueryParams={setRequestQueryParams}
                requestFollowRedirects={requestFollowRedirects}
                setRequestFollowRedirects={setRequestFollowRedirects}
                requestTimeoutMs={requestTimeoutMs}
                setRequestTimeoutMs={setRequestTimeoutMs}
                requestGrpcService={requestGrpcService}
                setRequestGrpcService={setRequestGrpcService}
                requestGrpcMethod={requestGrpcMethod}
                setRequestGrpcMethod={setRequestGrpcMethod}
                requestGrpcMessage={requestGrpcMessage}
                setRequestGrpcMessage={setRequestGrpcMessage}
                requestGrpcMetadata={requestGrpcMetadata}
                setRequestGrpcMetadata={setRequestGrpcMetadata}
                requestGrpcUseReflection={requestGrpcUseReflection}
                setRequestGrpcUseReflection={setRequestGrpcUseReflection}
                requestWebSocketMessages={requestWebSocketMessages}
                setRequestWebSocketMessages={setRequestWebSocketMessages}
                requestWebSocketMaxMessages={requestWebSocketMaxMessages}
                setRequestWebSocketMaxMessages={setRequestWebSocketMaxMessages}
                isCreatingFolder={createFolderMutation.isPending}
                isCreatingRequest={createRequestMutation.isPending}
                onCreateFolder={() => createFolderMutation.mutate()}
                onCreateRequest={() => createRequestMutation.mutate()}
              />

              <WorkspaceTreePanel
                workspaceId={selectedWorkspaceId}
                workspaceTree={workspaceTree}
                treeRef={treeRef}
                getContextMenu={handleWorkspaceTreeGetContextMenu}
                getEditOptions={handleWorkspaceTreeGetEditOptions}
                onActivate={handleWorkspaceTreeActivate}
                onReorder={(parentId, children) => reorderTreeMutation.mutate({ parentId, children })}
              />
            </aside>

            <section className="flex flex-col gap-4">
              <FolderSnapshotPanel
                folderNode={selectedFolderNode}
                editName={folderEditName}
                setEditName={setFolderEditName}
                moveControls={
                  selectedFolderNode == null ? null : (
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
                  )
                }
                isSaving={updateFolderMutation.isPending}
                isDeleting={deleteFolderNodeMutation.isPending}
                onSave={() => updateFolderMutation.mutate()}
                onUseAsParent={() => {
                  if (selectedFolderNode != null) {
                    setRequestParentId(selectedFolderNode.id);
                  }
                }}
                onDelete={() => deleteFolderNodeMutation.mutate()}
              />

              <RequestSnapshotPanel
                request={requestQuery.data}
                error={requestQuery.error}
                editName={requestEditName}
                setEditName={setRequestEditName}
                editDescription={requestEditDescription}
                setEditDescription={setRequestEditDescription}
                editUrl={requestEditUrl}
                setEditUrl={setRequestEditUrl}
                editHttpMethod={requestEditHttpMethod}
                setEditHttpMethod={setRequestEditHttpMethod}
                editHttpBody={requestEditHttpBody}
                setEditHttpBody={setRequestEditHttpBody}
                editHeaders={requestEditHeaders}
                setEditHeaders={setRequestEditHeaders}
                editQueryParams={requestEditQueryParams}
                setEditQueryParams={setRequestEditQueryParams}
                editFollowRedirects={requestEditFollowRedirects}
                setEditFollowRedirects={setRequestEditFollowRedirects}
                editTimeoutMs={requestEditTimeoutMs}
                setEditTimeoutMs={setRequestEditTimeoutMs}
                editGrpcService={requestEditGrpcService}
                setEditGrpcService={setRequestEditGrpcService}
                editGrpcMethod={requestEditGrpcMethod}
                setEditGrpcMethod={setRequestEditGrpcMethod}
                editGrpcMessage={requestEditGrpcMessage}
                setEditGrpcMessage={setRequestEditGrpcMessage}
                editGrpcMetadata={requestEditGrpcMetadata}
                setEditGrpcMetadata={setRequestEditGrpcMetadata}
                editGrpcUseReflection={requestEditGrpcUseReflection}
                setEditGrpcUseReflection={setRequestEditGrpcUseReflection}
                editWebSocketMessages={requestEditWebSocketMessages}
                setEditWebSocketMessages={setRequestEditWebSocketMessages}
                editWebSocketMaxMessages={requestEditWebSocketMaxMessages}
                setEditWebSocketMaxMessages={setRequestEditWebSocketMaxMessages}
                configText={requestConfigText}
                setConfigText={setRequestConfigText}
                moveControls={
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
                }
                isSaving={updateRequestMutation.isPending}
                isDeleting={deleteRequestNodeMutation.isPending}
                canDelete={selectedRequestNode != null}
                onSaveStructured={() => updateRequestMutation.mutate("structured")}
                onSaveRaw={() => updateRequestMutation.mutate("raw")}
                onDelete={() => deleteRequestNodeMutation.mutate()}
              />

              <RunHistoryPanel
                runs={runs}
                selectedRunId={selectedRunId ?? ""}
                error={runsQuery.error}
                onSelectRun={(runId) => setSearch({ runId })}
              />
            </section>

            <section className="flex flex-col gap-4">
              <RunEventTimelinePanel
                eventKind={eventKind}
                setEventKind={setEventKind}
                events={runEventsQuery.data?.items ?? []}
                error={runEventsQuery.error}
              />

              <Panel title="Captured Bodies" subtitle="Response/message payloads stored by the Yaku body store.">
                <YakuBodyViewer
                  bodies={runBodies}
                  selectedBodyId={selectedBodyId}
                  setSelectedBodyId={setSelectedBodyId}
                  bodyBytes={runBodyBytesQuery.data}
                  error={runBodyBytesQuery.error}
                />
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
            updateFolderMutation.error,
            createRequestMutation.error,
            updateRequestMutation.error,
            moveNodeMutation.error,
            renameTreeNodeMutation.error,
            reorderTreeMutation.error,
            startTreeRequestMutation.error,
            deleteRequestNodeMutation.error,
            deleteFolderNodeMutation.error,
            deleteTreeNodeMutation.error,
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

function MutationErrors({ errors }: { errors: unknown[] }) {
  const error = errors.find(Boolean);
  return error ? <FormattedError>{String(error)}</FormattedError> : null;
}

function preferredBodyId(bodies: YakuRunBody[]) {
  return bodies.find((body) => body.bodyRole === "response")?.id ?? bodies[0]?.id;
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value !== "" ? value : undefined;
}
