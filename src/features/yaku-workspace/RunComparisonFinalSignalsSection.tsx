import { EventSignalChip } from "./RunPanelsCompareShared";
import { RunComparisonSectionShell } from "./RunComparisonSectionShell";
import type {
  RunFailureComparison,
  RunFailureSummary,
} from "./RunPanelsComparisonModel";

export function RunComparisonFinalSignalsSection({
  isReady,
  focusedSignalLabel,
  selectedEventId,
  comparison,
  currentSummary,
  onOpenEvent,
}: {
  isReady: boolean;
  focusedSignalLabel: string | null;
  selectedEventId: number | null;
  comparison: RunFailureComparison;
  currentSummary: RunFailureSummary;
  onOpenEvent: (eventId: number, contextLabel?: string) => void;
}) {
  return (
    <RunComparisonSectionShell
      title="Final Signals"
      isReady={isReady}
      loadingLabel="Loading final signals..."
    >
      <>
        {focusedSignalLabel != null ? (
          <div className="mt-2 rounded-md border border-border-focus/60 bg-surface-highlight/50 px-3 py-2 text-xs text-text">
            Focused timeline event matches <span className="font-medium">{focusedSignalLabel}</span>.
          </div>
        ) : selectedEventId != null ? (
          <div className="mt-2 rounded-md border border-border-subtle bg-surface-highlight/35 px-3 py-2 text-xs text-text-subtle">
            Focused timeline event is outside the final signal set.
          </div>
        ) : null}
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <EventSignalChip
            label="Last HTTP Response"
            value={comparison.lastHttpResponse}
            eventId={currentSummary.lastHttpResponseEventId}
            onOpenEvent={onOpenEvent}
            openContextLabel="Final Signals · Last HTTP Response"
            isActive={selectedEventId === currentSummary.lastHttpResponseEventId}
          />
          <EventSignalChip
            label="Last Error"
            value={comparison.lastError}
            eventId={currentSummary.lastErrorEventId}
            onOpenEvent={onOpenEvent}
            openContextLabel="Final Signals · Last Error"
            isActive={selectedEventId === currentSummary.lastErrorEventId}
          />
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <EventSignalChip
            label="Last gRPC Message"
            value={comparison.lastGrpcMessage}
            eventId={currentSummary.lastGrpcMessageEventId}
            onOpenEvent={onOpenEvent}
            openContextLabel="Final Signals · Last gRPC Message"
            isActive={selectedEventId === currentSummary.lastGrpcMessageEventId}
          />
          <EventSignalChip
            label="Last WS Message"
            value={comparison.lastWebSocketMessage}
            eventId={currentSummary.lastWebSocketMessageEventId}
            onOpenEvent={onOpenEvent}
            openContextLabel="Final Signals · Last WS Message"
            isActive={selectedEventId === currentSummary.lastWebSocketMessageEventId}
          />
        </div>
      </>
    </RunComparisonSectionShell>
  );
}
