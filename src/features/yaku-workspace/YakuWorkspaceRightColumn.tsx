import { YakuBodyViewer } from "./BodyViewer";
import { RunEventTimelinePanel } from "./RunEventTimelinePanel";
import { WorkspacePanel as Panel } from "./WorkspacePanels";
import { buildYakuWorkspaceRightColumnProps } from "./YakuWorkspaceRightColumnPropsAssembler";
import type { YakuWorkspaceRightColumnProps } from "./YakuWorkspaceRightColumnTypes";

export function YakuWorkspaceRightColumn({
  queries,
  nav,
  runActions,
}: YakuWorkspaceRightColumnProps) {
  const { timelineProps, bodyViewerProps } = buildYakuWorkspaceRightColumnProps({
    queries,
    nav,
    runActions,
  });

  return (
    <section className="flex flex-col gap-4">
      <RunEventTimelinePanel {...timelineProps} />

      <Panel title="Captured Bodies" subtitle="Response/message payloads stored by the Yaku body store.">
        <YakuBodyViewer {...bodyViewerProps} />
      </Panel>
    </section>
  );
}
