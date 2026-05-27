import type { useYakuWorkspaceForms } from "./useYakuWorkspaceForms";
import type { useYakuWorkspaceMutations } from "./useYakuWorkspaceMutations";
import type { useYakuWorkspaceQueries } from "./useYakuWorkspaceQueries";
import type { useYakuWorkspaceRunPanelActions } from "./useYakuWorkspaceRunPanelActions";

export type YakuWorkspaceCenterColumnProps = {
  queries: ReturnType<typeof useYakuWorkspaceQueries>;
  forms: ReturnType<typeof useYakuWorkspaceForms>;
  mutations: ReturnType<typeof useYakuWorkspaceMutations>;
  selectedRunEventId: number | null;
  runActions: ReturnType<typeof useYakuWorkspaceRunPanelActions>;
};
