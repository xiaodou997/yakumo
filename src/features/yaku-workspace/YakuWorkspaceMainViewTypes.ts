import type { useYakuWorkspaceForms } from "./useYakuWorkspaceForms";
import type { useYakuWorkspaceLocalState } from "./useYakuWorkspaceNavigationState";
import type { useYakuWorkspaceMutations } from "./useYakuWorkspaceMutations";
import type { useYakuWorkspaceQueries } from "./useYakuWorkspaceQueries";
import type { useYakuWorkspaceRunPanelActions } from "./useYakuWorkspaceRunPanelActions";
import type { useYakuWorkspaceTreeActions } from "./useYakuWorkspaceTreeActions";

export type YakuWorkspaceMainViewProps = {
  setSearch: (patch: Partial<import("./types").YakuWorkspaceSearch>) => void;
  queries: ReturnType<typeof useYakuWorkspaceQueries>;
  forms: ReturnType<typeof useYakuWorkspaceForms>;
  mutations: ReturnType<typeof useYakuWorkspaceMutations>;
  nav: ReturnType<typeof useYakuWorkspaceLocalState>;
  treeActions: ReturnType<typeof useYakuWorkspaceTreeActions>;
  runActions: ReturnType<typeof useYakuWorkspaceRunPanelActions>;
};
