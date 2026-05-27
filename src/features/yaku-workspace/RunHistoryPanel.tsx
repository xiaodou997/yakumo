import { FormattedError } from "../../components/core/FormattedError";
import { VStack } from "../../components/core/Stacks";
import { RunComparisonCard, RunComparisonTargetChip } from "./RunPanelsCompare";
import { RunHistoryControls } from "./RunHistoryControls";
import { RunHistoryList } from "./RunHistoryList";
import { RunHistoryStats } from "./RunHistoryStats";
import type { RunHistoryPanelProps } from "./RunHistoryTypes";
import { useRunHistoryState } from "./useRunHistoryState";
import { EmptyCopy, WorkspacePanel } from "./WorkspacePanels";

export function RunHistoryPanel({
  runs,
  selectedRunId,
  selectedEventId,
  error,
  onSelectRun,
  onOpenEvent,
  onOpenRunEvent,
  onClearEventFocus,
}: RunHistoryPanelProps) {
  const {
    runSearch,
    setRunSearch,
    runStateFilter,
    setRunStateFilter,
    runSort,
    setRunSort,
    runErrorsOnly,
    setRunErrorsOnly,
    runCompareMode,
    setRunCompareMode,
    sortedRuns,
    previousChronologicalRuns,
    completedRuns,
    failedRuns,
    runningRuns,
    averageDurationMs,
    latestRun,
    selectedRun,
    comparisonTargets,
    comparisonRun,
    selectedRunEventSummary,
    comparisonRunEventSummary,
    selectedRunProtocolSummary,
    comparisonRunProtocolSummary,
    selectedRunPayloadSummary,
    comparisonRunPayloadSummary,
    selectedRunFailureSummary,
    comparisonRunFailureSummary,
    eventSummaryReady,
    successRate,
    comparisonLabel,
  } = useRunHistoryState({
    runs,
    selectedRunId,
  });

  return (
    <WorkspacePanel title="Run History" subtitle="Newest runs for the selected request.">
      {error ? (
        <FormattedError>{String(error)}</FormattedError>
      ) : runs.length === 0 ? (
        <EmptyCopy>Send the selected request to create the first Yaku run.</EmptyCopy>
      ) : (
        <VStack space={3}>
          <RunHistoryControls
            runSearch={runSearch}
            runStateFilter={runStateFilter}
            runSort={runSort}
            runErrorsOnly={runErrorsOnly}
            runCompareMode={runCompareMode}
            runCount={runs.length}
            filteredRunCount={sortedRuns.length}
            comparisonLabel={comparisonLabel}
            onChangeRunSearch={setRunSearch}
            onChangeRunStateFilter={setRunStateFilter}
            onChangeRunSort={setRunSort}
            onChangeRunErrorsOnly={setRunErrorsOnly}
            onChangeRunCompareMode={setRunCompareMode}
          />
          {selectedRun != null && comparisonTargets != null ? (
            <div className="grid gap-2 md:grid-cols-3">
              <RunComparisonTargetChip
                label="Previous"
                run={comparisonTargets.previous}
                isActive={runCompareMode === "previous"}
                onUse={() => setRunCompareMode("previous")}
                onInspect={(runId: string) => onSelectRun(runId)}
              />
              <RunComparisonTargetChip
                label="Last Success"
                run={comparisonTargets.last_success}
                isActive={runCompareMode === "last_success"}
                onUse={() => setRunCompareMode("last_success")}
                onInspect={(runId: string) => onSelectRun(runId)}
              />
              <RunComparisonTargetChip
                label="Last Failed"
                run={comparisonTargets.last_failed}
                isActive={runCompareMode === "last_failed"}
                onUse={() => setRunCompareMode("last_failed")}
                onInspect={(runId: string) => onSelectRun(runId)}
              />
            </div>
          ) : null}
          <RunHistoryFocusBanner
            selectedEventId={selectedEventId}
            onClearEventFocus={onClearEventFocus}
          />
          <RunHistoryStats
            latestRun={latestRun}
            completedCount={completedRuns.length}
            successRate={successRate}
            averageDurationMs={averageDurationMs}
            failedCount={failedRuns.length}
            runningCount={runningRuns.length}
          />
          {selectedRun != null ? (
            <RunComparisonCard
              current={selectedRun}
              base={comparisonRun}
              mode={runCompareMode}
              currentEventSummary={selectedRunEventSummary}
              baseEventSummary={comparisonRunEventSummary}
              currentProtocolSummary={selectedRunProtocolSummary}
              baseProtocolSummary={comparisonRunProtocolSummary}
              currentPayloadSummary={selectedRunPayloadSummary}
              basePayloadSummary={comparisonRunPayloadSummary}
              currentFailureSummary={selectedRunFailureSummary}
              baseFailureSummary={comparisonRunFailureSummary}
              isEventSummaryReady={eventSummaryReady}
              onOpenEvent={onOpenEvent}
              onOpenRunEvent={onOpenRunEvent}
              onSelectRun={onSelectRun}
              selectedEventId={selectedEventId}
            />
          ) : null}
          <RunHistoryList
            runs={sortedRuns}
            selectedRunId={selectedRunId}
            previousChronologicalRuns={previousChronologicalRuns}
            onSelectRun={onSelectRun}
          />
        </VStack>
      )}
    </WorkspacePanel>
  );
}

function RunHistoryFocusBanner({
  selectedEventId,
  onClearEventFocus,
}: {
  selectedEventId: number | null;
  onClearEventFocus: () => void;
}) {
  if (selectedEventId == null) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-highlight/35 px-3 py-2 text-xs text-text-subtle">
      <div>Focused timeline event #{selectedEventId}</div>
      <button
        type="button"
        onClick={onClearEventFocus}
        className="font-medium text-text-subtle hover:text-text"
      >
        Clear Focus
      </button>
    </div>
  );
}
