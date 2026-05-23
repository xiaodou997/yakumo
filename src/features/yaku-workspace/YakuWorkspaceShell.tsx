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
import { useYakuWorkspaceForms } from "./useYakuWorkspaceForms";
import { useYakuWorkspaceMutations } from "./useYakuWorkspaceMutations";
import { useYakuWorkspaceQueries } from "./useYakuWorkspaceQueries";
import type { WorkspaceTreeItem, YakuWorkspaceSearch } from "./types";

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
    cookieJars,
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
  const {
    requestBuilderDraft,
    requestEditDraft,
    workspaceName,
    setWorkspaceName,
    environmentName,
    setEnvironmentName,
    environmentVariablesText,
    setEnvironmentVariablesText,
    cookieJarName,
    setCookieJarName,
    folderName,
    folderEditName,
    setFolderEditName,
    folderMoveParentId,
    setFolderMoveParentId,
    requestMoveParentId,
    setRequestMoveParentId,
  } = useYakuWorkspaceForms({
    selectedEnvironment,
    selectedFolderNode,
    selectedRequestNode,
    loadedRequest: requestQuery.data,
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
    const nextBodyId = preferredBodyId(runBodies);
    setSelectedBodyId((prev) =>
      runBodies.some((body) => body.id === prev) ? prev : (nextBodyId ?? ""),
    );
  }, [runBodies]);

  const {
    invalidateRunData,
    startRunMutation,
    startTreeRequestMutation,
    cancelRunMutation,
    createWorkspaceMutation,
    createEnvironmentMutation,
    updateEnvironmentMutation,
    deleteEnvironmentMutation,
    createCookieJarMutation,
    clearCookieJarMutation,
    deleteCookieJarMutation,
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
    cookieJarName,
    folderName,
    folderEditName,
    requestBuilderDraft,
    requestEditDraft,
    setSearch,
  });

  useListenToTauriEvent<YakuRunLifecycleEvent>(yakuEventNames.runLifecycle, ({ payload }) => {
    void invalidateRunData(payload.runId, payload.requestId);
  });

  const handleWorkspaceTreeActivate = useCallback(
    (item: WorkspaceTreeItem) => {
      if (item.kind === "folder") {
        setSearch({ folderId: item.id, requestId: undefined, runId: undefined });
        requestBuilderDraft.setParentId(item.id);
        return;
      }
      if (item.kind === "request" && item.requestId != null) {
        setSearch({ requestId: item.requestId, runId: undefined, folderId: undefined });
        requestBuilderDraft.setParentId(item.parentId ?? "__root__");
      }
    },
    [requestBuilderDraft, setSearch],
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
                cookieJars={cookieJars}
                selectedWorkspaceId={selectedWorkspaceId}
                selectedEnvironmentId={selectedEnvironmentId}
                workspaceName={workspaceName}
                setWorkspaceName={setWorkspaceName}
                environmentName={environmentName}
                setEnvironmentName={setEnvironmentName}
                environmentVariablesText={environmentVariablesText}
                setEnvironmentVariablesText={setEnvironmentVariablesText}
                cookieJarName={cookieJarName}
                setCookieJarName={setCookieJarName}
                retention={retentionQuery.data}
                gcReport={gcBodiesMutation.data}
                exportResult={exportBackupMutation.data ?? undefined}
                importResult={importBackupMutation.data ?? undefined}
                isCreatingWorkspace={createWorkspaceMutation.isPending}
                isCreatingEnvironment={createEnvironmentMutation.isPending}
                isUpdatingEnvironment={updateEnvironmentMutation.isPending}
                isDeletingEnvironment={deleteEnvironmentMutation.isPending}
                isCreatingCookieJar={createCookieJarMutation.isPending}
                isClearingCookieJar={clearCookieJarMutation.isPending}
                isDeletingCookieJar={deleteCookieJarMutation.isPending}
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
                onCreateCookieJar={() => createCookieJarMutation.mutate()}
                onClearCookieJar={(jarId) => clearCookieJarMutation.mutate(jarId)}
                onDeleteCookieJar={(jarId) => deleteCookieJarMutation.mutate(jarId)}
                onSetRetention={(limit) => setRetentionMutation.mutate(limit)}
                onClearRetention={() => clearRetentionMutation.mutate()}
                onGcBodies={() => gcBodiesMutation.mutate()}
                onExportBackup={() => exportBackupMutation.mutate()}
                onImportBackup={() => importBackupMutation.mutate()}
              />

              <RequestBuilderPanel
                workspaceId={selectedWorkspaceId}
                folderNodes={folderNodes}
                cookieJars={cookieJars}
                draft={requestBuilderDraft}
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
                    requestBuilderDraft.setParentId(selectedFolderNode.id);
                  }
                }}
                onDelete={() => deleteFolderNodeMutation.mutate()}
              />

              <RequestSnapshotPanel
                request={requestQuery.data}
                error={requestQuery.error}
                draft={requestEditDraft}
                cookieJars={cookieJars}
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
                  isLoading={runBodyBytesQuery.isFetching}
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
            createCookieJarMutation.error,
            clearCookieJarMutation.error,
            deleteCookieJarMutation.error,
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
