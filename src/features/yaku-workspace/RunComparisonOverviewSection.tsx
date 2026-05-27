import { EventStatChip } from "./RunPanelsCompareShared";

export function RunComparisonOverviewSection({
  currentState,
  baseState,
  currentStatusCode,
  baseStatusCode,
  durationDelta,
  currentError,
  baseError,
  formatDurationMs,
}: {
  currentState: string;
  baseState: string;
  currentStatusCode: number | null | undefined;
  baseStatusCode: number | null | undefined;
  durationDelta: number | null;
  currentError: string | null | undefined;
  baseError: string | null | undefined;
  formatDurationMs: (value: number) => string;
}) {
  const statusChanged = currentStatusCode !== baseStatusCode;
  const stateChanged = currentState !== baseState;

  return (
    <div className="mt-3 grid gap-2 md:grid-cols-4">
      <EventStatChip
        label="State"
        value={stateChanged ? `${baseState} → ${currentState}` : currentState}
      />
      <EventStatChip
        label="Status"
        value={
          statusChanged
            ? `${baseStatusCode ?? "none"} → ${currentStatusCode ?? "none"}`
            : `${currentStatusCode ?? "none"}`
        }
      />
      <EventStatChip
        label="Duration"
        value={
          durationDelta == null
            ? "n/a"
            : `${durationDelta >= 0 ? "+" : "-"}${formatDurationMs(Math.abs(durationDelta))}`
        }
      />
      <EventStatChip
        label="Error"
        value={
          currentError == null
            ? "none"
            : baseError == null
              ? "new"
              : currentError === baseError
                ? "same"
                : "changed"
        }
      />
    </div>
  );
}
