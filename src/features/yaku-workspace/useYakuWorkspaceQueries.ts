import type { YakuRunEventKind } from "../../lib/yaku-client";
import type { WorkspaceTreeItem, YakuWorkspaceSearch } from "./types";
import { useYakuWorkspaceRunQueries } from "./useYakuWorkspaceRunQueries";
import { useYakuWorkspaceScopeQueries } from "./useYakuWorkspaceScopeQueries";

export function useYakuWorkspaceQueries({
  search,
  eventKind,
  selectedBodyId,
}: {
  search: YakuWorkspaceSearch;
  eventKind: "all" | YakuRunEventKind;
  selectedBodyId: string;
}) {
  const scopeQueries = useYakuWorkspaceScopeQueries({ search });
  const runQueries = useYakuWorkspaceRunQueries({
    selectedRequestId: scopeQueries.selectedRequestId,
    requestedRunId: search.runId,
    eventKind,
    selectedBodyId,
  });

  return {
    ...scopeQueries,
    ...runQueries,
  };
}

export type YakuWorkspaceTreeItem = WorkspaceTreeItem;
