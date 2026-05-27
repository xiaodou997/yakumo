import type { YakuRunPageItem } from "../../lib/yaku-client";
import { EventStatChip } from "./RunPanelsCompare";
import { formatDurationMs as modelFormatDurationMs } from "./RunPanelsHistoryModel";

export function RunHistoryStats({
  latestRun,
  completedCount,
  successRate,
  averageDurationMs,
  failedCount,
  runningCount,
}: {
  latestRun: YakuRunPageItem | null;
  completedCount: number;
  successRate: string;
  averageDurationMs: number | null;
  failedCount: number;
  runningCount: number;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-6">
      <EventStatChip
        label="Latest"
        value={
          latestRun == null
            ? "none"
            : `${latestRun.state}${latestRun.statusCode != null ? ` · ${latestRun.statusCode}` : ""}`
        }
      />
      <EventStatChip label="Completed" value={String(completedCount)} />
      <EventStatChip label="Success" value={successRate} />
      <EventStatChip
        label="Avg Duration"
        value={averageDurationMs == null ? "n/a" : modelFormatDurationMs(averageDurationMs)}
      />
      <EventStatChip label="Failed" value={String(failedCount)} />
      <EventStatChip label="Running" value={String(runningCount)} />
    </div>
  );
}
