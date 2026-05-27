import type { useYakuWorkspaceLocalState } from "./useYakuWorkspaceNavigationState";
import type { useYakuWorkspaceQueries } from "./useYakuWorkspaceQueries";
import type { useYakuWorkspaceRunPanelActions } from "./useYakuWorkspaceRunPanelActions";

export type YakuWorkspaceRightColumnProps = {
  queries: ReturnType<typeof useYakuWorkspaceQueries>;
  nav: ReturnType<typeof useYakuWorkspaceLocalState>;
  runActions: ReturnType<typeof useYakuWorkspaceRunPanelActions>;
};
