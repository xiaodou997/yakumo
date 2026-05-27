import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getYakuRunRetention,
  getYakuSecretAudit,
  listYakuCookieJars,
  listYakuEnvironments,
  listYakuRequests,
  listYakuWorkspaces,
  type YakuRequestNodePageItem,
} from "../../lib/yaku-client";
import type { YakuWorkspaceSearch } from "./types";
import { buildWorkspaceTree } from "./workspaceTree";
import {
  resolveSelectedId,
  resolveSelectedRequestId,
} from "./useYakuWorkspaceQueryUtils";

export function useYakuWorkspaceScopeQueries({
  search,
}: {
  search: YakuWorkspaceSearch;
}) {
  const workspacesQuery = useQuery({
    queryKey: ["yaku", "workspaces"],
    queryFn: () => listYakuWorkspaces(),
    placeholderData: (prev) => prev,
  });
  const workspaces = workspacesQuery.data?.items ?? [];
  const selectedWorkspaceId = resolveSelectedId(workspaces, search.workspaceId);
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null;

  const environmentsQuery = useQuery({
    enabled: selectedWorkspaceId != null,
    queryKey: ["yaku", "environments", selectedWorkspaceId],
    queryFn: () => listYakuEnvironments(selectedWorkspaceId!),
    placeholderData: (prev) => prev,
  });
  const environments = environmentsQuery.data ?? [];
  const selectedEnvironmentId = resolveSelectedId(environments, search.environmentId);
  const selectedEnvironment =
    environments.find((environment) => environment.id === selectedEnvironmentId) ??
    null;

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

  const secretAuditQuery = useQuery({
    enabled: selectedWorkspaceId != null,
    queryKey: ["yaku", "secret-audit", selectedWorkspaceId],
    queryFn: () => getYakuSecretAudit(selectedWorkspaceId!),
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
        (item): item is YakuRequestNodePageItem & { requestId: string } =>
          item.requestId != null,
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
    secretAuditQuery,
    requestsQuery,
    requestTreeNodes,
    requestNodes,
    folderNodes,
    workspaceTree,
    selectedFolderNode,
    selectedRequestId,
    selectedRequestNode,
  };
}
