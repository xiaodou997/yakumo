export const yakuQueryKeys = {
  all: ["yaku"] as const,
  workspaces: () => [...yakuQueryKeys.all, "workspaces"] as const,
  workspace: (workspaceId: string | null | undefined) =>
    [...yakuQueryKeys.all, "workspace", workspaceId] as const,
  environments: (workspaceId: string | null | undefined) =>
    [...yakuQueryKeys.all, "environments", workspaceId] as const,
  requestTree: (workspaceId: string | null | undefined) =>
    [...yakuQueryKeys.all, "requests", workspaceId] as const,
  request: (requestId: string | null | undefined) =>
    [...yakuQueryKeys.all, "request", requestId] as const,
  runsForRequest: (requestId: string | null | undefined) =>
    [...yakuQueryKeys.all, "runs", "request", requestId] as const,
  runEvents: (runId: string | null | undefined, eventKind: string | null | undefined = null) =>
    [...yakuQueryKeys.all, "run-events", runId, eventKind] as const,
  runBodies: (runId: string | null | undefined) =>
    [...yakuQueryKeys.all, "run-bodies", runId] as const,
  runBodyBytes: (bodyId: string | null | undefined) =>
    [...yakuQueryKeys.all, "run-body-bytes", bodyId] as const,
  runRetention: (workspaceId: string | null | undefined) =>
    [...yakuQueryKeys.all, "run-retention", workspaceId] as const,
};
