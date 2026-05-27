import type { useYakuWorkspaceForms } from "./useYakuWorkspaceForms";
import type { useYakuWorkspaceLocalState } from "./useYakuWorkspaceNavigationState";
import type { useYakuWorkspaceMutations } from "./useYakuWorkspaceMutations";
import type { useYakuWorkspaceQueries } from "./useYakuWorkspaceQueries";
import type { useYakuWorkspaceTreeActions } from "./useYakuWorkspaceTreeActions";
import type { YakuWorkspaceSearch } from "./types";

export type YakuWorkspaceLeftColumnProps = {
  setSearch: (patch: Partial<YakuWorkspaceSearch>) => void;
  queries: ReturnType<typeof useYakuWorkspaceQueries>;
  forms: ReturnType<typeof useYakuWorkspaceForms>;
  mutations: ReturnType<typeof useYakuWorkspaceMutations>;
  nav: ReturnType<typeof useYakuWorkspaceLocalState>;
  treeActions: ReturnType<typeof useYakuWorkspaceTreeActions>;
};
