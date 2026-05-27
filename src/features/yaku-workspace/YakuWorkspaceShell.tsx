import { YakuWorkspaceMainView } from "./YakuWorkspaceMainView";
import type { YakuWorkspaceSearch } from "./types";
import { useYakuWorkspaceShellState } from "./useYakuWorkspaceShellState";

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
  const { nav, queries, forms, mutations, treeActions, runActions } =
    useYakuWorkspaceShellState({
      search,
      setSearch,
    });

  return (
    <YakuWorkspaceMainView
      setSearch={setSearch}
      queries={queries}
      forms={forms}
      mutations={mutations}
      nav={nav}
      treeActions={treeActions}
      runActions={runActions}
    />
  );
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value !== "" ? value : undefined;
}
