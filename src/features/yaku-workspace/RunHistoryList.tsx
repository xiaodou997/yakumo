import classNames from "classnames";
import { VStack } from "../../components/core/Stacks";
import type { YakuRunPageItem } from "../../lib/yaku-client";
import {
  compareRuns as modelCompareRuns,
  formatRunTiming as modelFormatRunTiming,
} from "./RunPanelsHistoryModel";
import { EmptyCopy } from "./WorkspacePanels";

export function RunHistoryList({
  runs,
  selectedRunId,
  previousChronologicalRuns,
  onSelectRun,
}: {
  runs: YakuRunPageItem[];
  selectedRunId: string;
  previousChronologicalRuns: Map<string, YakuRunPageItem | null>;
  onSelectRun: (runId: string) => void;
}) {
  if (runs.length === 0) {
    return <EmptyCopy>No runs match the current search.</EmptyCopy>;
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <RunHistoryListItem
          key={run.id}
          run={run}
          previousRun={previousChronologicalRuns.get(run.id) ?? null}
          isActive={run.id === selectedRunId}
          onSelectRun={onSelectRun}
        />
      ))}
    </div>
  );
}

function RunHistoryListItem({
  run,
  previousRun,
  isActive,
  onSelectRun,
}: {
  run: YakuRunPageItem;
  previousRun: YakuRunPageItem | null;
  isActive: boolean;
  onSelectRun: (runId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelectRun(run.id)}
      className={classNames(
        "grid w-full grid-cols-[1fr_auto] gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
        isActive
          ? "border-border-focus bg-surface text-text"
          : "border-border-subtle bg-surface-highlight/40 text-text-subtle hover:border-border hover:text-text",
      )}
    >
      <VStack space={2}>
        <div className="font-medium">
          {run.state}
          {run.statusCode != null && ` · ${run.statusCode}`}
        </div>
        <div className="truncate text-xs text-text-subtlest">{run.id}</div>
        <div className="flex flex-wrap gap-2 text-[11px] text-text-subtle">
          <span>{modelFormatRunTiming(run)}</span>
          {previousRun != null ? (
            <span>{modelCompareRuns(run, previousRun)}</span>
          ) : null}
        </div>
        {run.error ? (
          <div className="line-clamp-2 text-[11px] text-danger">
            {run.error}
          </div>
        ) : null}
      </VStack>
      <div className="text-right text-xs text-text-subtle">
        {new Date(run.startedAt).toLocaleString()}
      </div>
    </button>
  );
}
