import classNames from "classnames";
import { Button } from "../../components/core/Button";
import { HStack } from "../../components/core/Stacks";
import { EventStatChip } from "./RunPanelsCompareShared";
import { RunComparisonSectionShell } from "./RunComparisonSectionShell";
import type { EventJumpBuilder } from "./RunComparisonSectionTypes";
import type { RunEventComparison } from "./RunPanelsComparisonModel";

export function RunComparisonEventSummarySection({
  isReady,
  comparison,
  openCurrentEvent,
  openBaselineEvent,
}: {
  isReady: boolean;
  comparison: RunEventComparison;
  openCurrentEvent: EventJumpBuilder;
  openBaselineEvent: EventJumpBuilder;
}) {
  return (
    <RunComparisonSectionShell
      title="Event Summary"
      isReady={isReady}
      loadingLabel="Loading event summary..."
    >
      <>
        <div className="mt-2 grid gap-2 md:grid-cols-4">
          <EventStatChip label="Total" value={comparison.total} />
          <EventStatChip label="Changed Kinds" value={comparison.changedKinds} />
          <EventStatChip label="New Kinds" value={comparison.newKinds} />
          <EventStatChip label="Removed Kinds" value={comparison.removedKinds} />
        </div>
        {comparison.diffs.length === 0 ? (
          <div className="mt-3 text-xs text-text-subtle">Event mix is unchanged.</div>
        ) : (
          <div className="mt-3 space-y-1">
            {comparison.diffs.map((diff) => {
              const openCurrent = openCurrentEvent(
                diff.currentEventId,
                `Event Summary · ${diff.kind} · Current`,
              );
              const openBaseline = openBaselineEvent(
                diff.baseEventId,
                `Event Summary · ${diff.kind} · Baseline`,
              );

              return (
                <div
                  key={diff.kind}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 rounded-md border border-border-subtle bg-surface-highlight/35 px-2 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-text">{diff.kind}</div>
                    <div className="mt-1 text-[11px] text-text-subtle">
                      {diff.baseCount} → {diff.currentCount}
                    </div>
                  </div>
                  <div className={classNames("self-start font-medium", diff.deltaClassName)}>
                    {diff.deltaLabel}
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
      </>
    </RunComparisonSectionShell>
  );
}
