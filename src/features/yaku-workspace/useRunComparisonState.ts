import {
  buildRunFailureDiffEntries,
  compareRunEventSummaries,
  compareRunFailureSummaries,
  compareRunPayloadSummaries,
  compareRunProtocolSummaries,
  getFocusedSignalLabel,
} from "./RunPanelsComparisonModel";
import { runDurationMs } from "./RunPanelsHistoryModel";
import type {
  RunEventSummary,
  RunFailureSummary,
  RunPayloadSummary,
  RunProtocolSummary,
} from "./RunPanelsComparisonModel";
import type { YakuRunPageItem } from "../../lib/yaku-client";

export function useRunComparisonState({
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
}: {
  current: YakuRunPageItem;
  base: YakuRunPageItem | null;
  currentEventSummary: RunEventSummary;
  baseEventSummary: RunEventSummary;
  currentProtocolSummary: RunProtocolSummary;
  baseProtocolSummary: RunProtocolSummary;
  currentPayloadSummary: RunPayloadSummary;
  basePayloadSummary: RunPayloadSummary;
  currentFailureSummary: RunFailureSummary;
  baseFailureSummary: RunFailureSummary;
  selectedEventId: number | null;
  onOpenEvent: (eventId: number, contextLabel?: string) => void;
  onOpenRunEvent: (runId: string, eventId: number, contextLabel?: string) => void;
}) {
  const currentDuration = runDurationMs(current);
  const baseDuration = base == null ? null : runDurationMs(base);
  const durationDelta =
    currentDuration != null && baseDuration != null ? currentDuration - baseDuration : null;
  const eventComparison = compareRunEventSummaries(currentEventSummary, baseEventSummary);
  const protocolComparison = compareRunProtocolSummaries(
    currentProtocolSummary,
    baseProtocolSummary,
  );
  const payloadComparison = compareRunPayloadSummaries(
    currentPayloadSummary,
    basePayloadSummary,
  );
  const failureComparison = compareRunFailureSummaries(
    currentFailureSummary,
    baseFailureSummary,
  );
  const failureDiffEntries = buildRunFailureDiffEntries(
    currentFailureSummary,
    baseFailureSummary,
  );
  const focusedSignalLabel = getFocusedSignalLabel(currentFailureSummary, selectedEventId);
  const openCurrentEvent = (eventId: number | null, contextLabel: string) =>
    eventId == null ? null : () => onOpenEvent(eventId, contextLabel);
  const openBaselineEvent = (eventId: number | null, contextLabel: string) =>
    base == null || eventId == null
      ? null
      : () => onOpenRunEvent(base.id, eventId, contextLabel);

  return {
    durationDelta,
    eventComparison,
    protocolComparison,
    payloadComparison,
    failureComparison,
    failureDiffEntries,
    focusedSignalLabel,
    openCurrentEvent,
    openBaselineEvent,
  };
}
