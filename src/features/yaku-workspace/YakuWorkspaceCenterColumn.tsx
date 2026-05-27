import { FolderSnapshotPanel } from "./FolderSnapshotPanel";
import { RequestSnapshotPanel } from "./RequestSnapshotPanel";
import { RunHistoryPanel } from "./RunHistoryPanel";
import { buildCenterColumnPanelProps } from "./YakuWorkspaceCenterColumnPropsAssembler";
import type { YakuWorkspaceCenterColumnProps } from "./YakuWorkspaceCenterColumnTypes";

export function YakuWorkspaceCenterColumn({
  queries,
  forms,
  mutations,
  selectedRunEventId,
  runActions,
}: YakuWorkspaceCenterColumnProps) {
  const { folderSnapshotProps, requestSnapshotProps, runHistoryProps } =
    buildCenterColumnPanelProps({
      queries,
      forms,
      mutations,
      selectedRunEventId,
      runActions,
    });

  return (
    <section className="flex flex-col gap-4">
      <FolderSnapshotPanel {...folderSnapshotProps} />

      <RequestSnapshotPanel {...requestSnapshotProps} />

      <RunHistoryPanel {...runHistoryProps} />
    </section>
  );
}
