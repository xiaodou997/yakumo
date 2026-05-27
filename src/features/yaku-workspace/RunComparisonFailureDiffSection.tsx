import classNames from "classnames";
import { Button } from "../../components/core/Button";
import { HStack } from "../../components/core/Stacks";
import { RunComparisonSectionShell } from "./RunComparisonSectionShell";
import type { EventJumpBuilder } from "./RunComparisonSectionTypes";
import type { RunFailureDiffEntry } from "./RunPanelsComparisonModel";

export function RunComparisonFailureDiffSection({
  isReady,
  entries,
  openCurrentEvent,
  openBaselineEvent,
}: {
  isReady: boolean;
  entries: RunFailureDiffEntry[];
  openCurrentEvent: EventJumpBuilder;
  openBaselineEvent: EventJumpBuilder;
}) {
  return (
    <RunComparisonSectionShell
      title="Failure Diff"
      isReady={isReady}
      loadingLabel="Loading failure diff..."
    >
      {entries.length === 0 ? (
        <div className="mt-3 text-xs text-text-subtle">
          No failure signal changes between current and baseline.
        </div>
      ) : (
        <div className="mt-3 space-y-1">
          {entries.map((entry) => {
            const openCurrent = openCurrentEvent(
              entry.currentEventId,
              `Failure Diff · ${entry.label} · Current`,
            );
            const openBaseline = openBaselineEvent(
              entry.baseEventId,
              `Failure Diff · ${entry.label} · Baseline`,
            );

            return (
              <div
                key={entry.label}
                className="grid grid-cols-[8rem_minmax(0,1fr)_auto] gap-3 rounded-md border border-border-subtle bg-surface-highlight/35 px-2 py-2 text-xs"
              >
                <div className="font-medium text-text">{entry.label}</div>
                <div className={classNames("min-w-0", entry.severityClassName)}>
                  {entry.summary}
                </div>
                <HStack space={1} className="shrink-0">
                  {openCurrent != null ? (
                    <Button size="2xs" type="button" variant="border" onClick={openCurrent}>
                      Current
                    </Button>
                  ) : null}
                  {openBaseline != null ? (
                    <Button size="2xs" type="button" variant="border" onClick={openBaseline}>
                      Baseline
                    </Button>
                  ) : null}
                </HStack>
              </div>
            );
          })}
        </div>
      )}
    </RunComparisonSectionShell>
  );
}
