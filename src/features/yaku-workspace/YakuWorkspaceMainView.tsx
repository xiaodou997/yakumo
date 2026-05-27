import { FormattedError } from "../../components/core/FormattedError";
import { YakuWorkspaceCenterColumn } from "./YakuWorkspaceCenterColumn";
import { YakuWorkspaceHeroSection } from "./YakuWorkspaceHeroSection";
import { YakuWorkspaceLeftColumn } from "./YakuWorkspaceLeftColumn";
import { YakuWorkspaceMutationErrors } from "./YakuWorkspaceMutationErrors";
import { YakuWorkspaceRightColumn } from "./YakuWorkspaceRightColumn";
import { buildYakuWorkspaceMainViewProps } from "./YakuWorkspaceMainViewPropsAssembler";
import type { YakuWorkspaceMainViewProps } from "./YakuWorkspaceMainViewTypes";

export function YakuWorkspaceMainView({
  setSearch,
  queries,
  forms,
  mutations,
  nav,
  treeActions,
  runActions,
}: YakuWorkspaceMainViewProps) {
  const { heroProps, leftColumnProps, centerColumnProps, rightColumnProps, mutationErrorList } =
    buildYakuWorkspaceMainViewProps({
      setSearch,
      queries,
      forms,
      mutations,
      nav,
      treeActions,
      runActions,
    });

  return (
    <div className="h-full overflow-auto bg-surface">
      <div className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col gap-6 px-5 py-5">
        <YakuWorkspaceHeroSection {...heroProps} />

        {queries.workspacesQuery.error ? (
          <FormattedError>{String(queries.workspacesQuery.error)}</FormattedError>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,380px)_minmax(0,1fr)]">
            <YakuWorkspaceLeftColumn {...leftColumnProps} />
            <YakuWorkspaceCenterColumn {...centerColumnProps} />
            <YakuWorkspaceRightColumn {...rightColumnProps} />
          </div>
        )}

        {mutations.startRunMutation.error ? (
          <FormattedError>{String(mutations.startRunMutation.error)}</FormattedError>
        ) : null}
        {mutations.cancelRunMutation.error ? (
          <FormattedError>{String(mutations.cancelRunMutation.error)}</FormattedError>
        ) : null}
        <YakuWorkspaceMutationErrors errors={mutationErrorList} />
      </div>
    </div>
  );
}
