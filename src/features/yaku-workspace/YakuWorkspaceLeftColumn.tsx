import { RequestBuilderPanel } from "./RequestBuilderPanel";
import { WorkspaceContextPanel } from "./WorkspaceContextPanel";
import { WorkspaceTreePanel } from "./WorkspaceTreePanel";
import { buildYakuWorkspaceLeftColumnProps } from "./YakuWorkspaceLeftColumnPropsAssembler";
import type { YakuWorkspaceLeftColumnProps } from "./YakuWorkspaceLeftColumnTypes";

export function YakuWorkspaceLeftColumn({
  setSearch,
  queries,
  forms,
  mutations,
  nav,
  treeActions,
}: YakuWorkspaceLeftColumnProps) {
  const { workspaceContextProps, requestBuilderProps, workspaceTreeProps } =
    buildYakuWorkspaceLeftColumnProps({
      setSearch,
      queries,
      forms,
      mutations,
      nav,
      treeActions,
    });

  return (
    <aside className="flex flex-col gap-4">
      <WorkspaceContextPanel {...workspaceContextProps} />
      <RequestBuilderPanel {...requestBuilderProps} />
      <WorkspaceTreePanel {...workspaceTreeProps} />
    </aside>
  );
}
