import classNames from "classnames";
import { Button } from "../../components/core/Button";
import { HStack } from "../../components/core/Stacks";
import type { YakuRunPageItem } from "../../lib/yaku-client";
import {
  formatDurationMs,
  formatRunComparisonModeLabel,
  formatRunComparisonTarget,
} from "./RunPanelsHistoryModel";
import type {
  RunEventSummary,
  RunFailureSummary,
  RunPayloadSummary,
  RunProtocolSummary,
} from "./RunPanelsComparisonModel";
import { RunComparisonEventSummarySection } from "./RunComparisonEventSummarySection";
import { RunComparisonFailureDiffSection } from "./RunComparisonFailureDiffSection";
import { RunComparisonFinalSignalsSection } from "./RunComparisonFinalSignalsSection";
import { RunComparisonOverviewSection } from "./RunComparisonOverviewSection";
import { RunComparisonProtocolSummarySection } from "./RunComparisonProtocolSummarySection";
import { RunComparisonRequestSummarySection } from "./RunComparisonRequestSummarySection";
import { RunComparisonTargetChip } from "./RunComparisonTargetChip";
import { useRunComparisonState } from "./useRunComparisonState";

export function RunComparisonCard({
  current,
  base,
  mode,
  currentEventSummary,
  baseEventSummary,
  currentProtocolSummary,
  baseProtocolSummary,
  currentPayloadSummary,
  basePayloadSummary,
  currentFailureSummary,
  baseFailureSummary,
  isEventSummaryReady,
  onOpenEvent,
  onOpenRunEvent,
  onSelectRun,
  selectedEventId,
}: {
  current: YakuRunPageItem;
  base: YakuRunPageItem | null;
  mode: "previous" | "last_success" | "last_failed";
  currentEventSummary: RunEventSummary;
  baseEventSummary: RunEventSummary;
  currentProtocolSummary: RunProtocolSummary;
  baseProtocolSummary: RunProtocolSummary;
  currentPayloadSummary: RunPayloadSummary;
  basePayloadSummary: RunPayloadSummary;
  currentFailureSummary: RunFailureSummary;
  baseFailureSummary: RunFailureSummary;
  isEventSummaryReady: boolean;
  onOpenEvent: (eventId: number, contextLabel?: string) => void;
  onOpenRunEvent: (runId: string, eventId: number, contextLabel?: string) => void;
  onSelectRun: (runId: string) => void;
  selectedEventId: number | null;
}) {
  const {
    durationDelta,
    eventComparison,
    protocolComparison,
    payloadComparison,
    failureComparison,
    failureDiffEntries,
    focusedSignalLabel,
    openCurrentEvent,
    openBaselineEvent,
  } = useRunComparisonState({
    current,
    base,
    currentEventSummary,
    baseEventSummary,
    currentProtocolSummary,
    baseProtocolSummary,
    currentPayloadSummary,
    basePayloadSummary,
    currentFailureSummary,
    baseFailureSummary,
    selectedEventId,
    onOpenEvent,
    onOpenRunEvent,
  });

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-highlight/35 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-text-subtlest">
            Run Comparison
          </div>
          <div className="mt-1 text-sm text-text">
            {formatRunComparisonModeLabel(mode)}
          </div>
        </div>
        <HStack space={2} className="shrink-0">
          <div className="text-xs text-text-subtle">
            {base == null ? "No comparison target" : base.id}
          </div>
          {base != null ? (
            <Button
              size="2xs"
              type="button"
              variant="border"
              onClick={() => onSelectRun(base.id)}
            >
              Open Baseline
            </Button>
          ) : null}
        </HStack>
      </div>
      {base == null ? (
        <div className="mt-2 text-xs text-text-subtle">No comparison target found.</div>
      ) : (
        <>
          <RunComparisonOverviewSection
            currentState={current.state}
            baseState={base.state}
            currentStatusCode={current.statusCode}
            baseStatusCode={base.statusCode}
            durationDelta={durationDelta}
            currentError={current.error}
            baseError={base.error}
            formatDurationMs={formatDurationMs}
          />
          <RunComparisonEventSummarySection
            isReady={isEventSummaryReady}
            comparison={eventComparison}
            openCurrentEvent={openCurrentEvent}
            openBaselineEvent={openBaselineEvent}
          />
          <RunComparisonProtocolSummarySection
            isReady={isEventSummaryReady}
            comparison={protocolComparison}
            currentFailureSummary={currentFailureSummary}
            baseFailureSummary={baseFailureSummary}
            openCurrentEvent={openCurrentEvent}
            openBaselineEvent={openBaselineEvent}
          />
          <RunComparisonRequestSummarySection
            isReady={isEventSummaryReady}
            comparison={payloadComparison}
            currentPayloadSummary={currentPayloadSummary}
            basePayloadSummary={basePayloadSummary}
            openCurrentEvent={openCurrentEvent}
            openBaselineEvent={openBaselineEvent}
          />
          <RunComparisonFinalSignalsSection
            isReady={isEventSummaryReady}
            focusedSignalLabel={focusedSignalLabel}
            selectedEventId={selectedEventId}
            comparison={failureComparison}
            currentSummary={currentFailureSummary}
            onOpenEvent={onOpenEvent}
          />
          <RunComparisonFailureDiffSection
            isReady={isEventSummaryReady}
            entries={failureDiffEntries}
            openCurrentEvent={openCurrentEvent}
            openBaselineEvent={openBaselineEvent}
          />
        </>
      )}
    </div>
  );
}

export { EventStatChip } from "./RunPanelsCompareShared";
export { RunComparisonTargetChip } from "./RunComparisonTargetChip";
