import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getYakuRequest,
  getYakuRunBodyBytes,
  getYakuRunRetention,
  listYakuCookieJars,
  listYakuEnvironments,
  listYakuRequests,
  listYakuRunBodies,
  listYakuRunEvents,
  listYakuRunsForRequest,
  listYakuWorkspaces,
  type YakuRequestNodePageItem,
  type YakuRunEventKind,
} from "../../lib/yaku-client";
import type { WorkspaceTreeItem, YakuWorkspaceSearch } from "./types";
import { buildWorkspaceTree } from "./workspaceTree";

export function useYakuWorkspaceQueries({
  search,
  eventKind,
  selectedBodyId,
}: {
  search: YakuWorkspaceSearch;
  eventKind: "all" | YakuRunEventKind;
  selectedBodyId: string;
}) {
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

  const cookieJarsQuery = useQuery({
    enabled: selectedWorkspaceId != null,
    queryKey: ["yaku", "cookie-jars", selectedWorkspaceId],
    queryFn: () => listYakuCookieJars(selectedWorkspaceId!),
    placeholderData: (prev) => prev,
  });
  const cookieJars = cookieJarsQuery.data ?? [];

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
  const requestTreeNodes = requestsQuery.data?.items ?? [];
  const requestNodes = useMemo(
    () =>
      requestTreeNodes.filter(
        (item): item is YakuRequestNodePageItem & { requestId: string } => item.requestId != null,
      ),
    [requestTreeNodes],
  );
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

  const runBodyBytesQuery = useQuery({
    enabled: selectedBodyId !== "",
    queryKey: ["yaku", "run-body-bytes", selectedBodyId],
    queryFn: () => getYakuRunBodyBytes(selectedBodyId),
  });

  return {
    workspacesQuery,
    workspaces,
    selectedWorkspaceId,
    selectedWorkspace,
    environmentsQuery,
    environments,
    selectedEnvironmentId,
    selectedEnvironment,
    cookieJarsQuery,
    cookieJars,
    retentionQuery,
    requestsQuery,
    requestTreeNodes,
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
    selectedRun,
    selectedRunIsRunning,
    runEventsQuery,
    runBodiesQuery,
    runBodies,
    runBodyBytesQuery,
  };
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

export type YakuWorkspaceTreeItem = WorkspaceTreeItem;
