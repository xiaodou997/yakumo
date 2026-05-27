import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listYakuRunEvents, type YakuRunPageItem } from "../../lib/yaku-client";
import {
  averageRunDurationMs as modelAverageRunDurationMs,
  buildPreviousRunMap as modelBuildPreviousRunMap,
  buildRunSearchText as modelBuildRunSearchText,
  compareRunsBySort as modelCompareRunsBySort,
  formatRunComparisonTarget as modelFormatRunComparisonTarget,
  getRunComparisonBase as modelGetRunComparisonBase,
  matchesRunFilters as modelMatchesRunFilters,
} from "./RunPanelsHistoryModel";
import { buildRunEventSummary as modelBuildRunEventSummary } from "./RunPanelsComparisonModel";
import {
  buildRunFailureSummary,
  buildRunPayloadSummary,
  buildRunProtocolSummary,
} from "./RunPanelsSummaries";
import type { RunCompareMode, RunSort, RunStateFilter } from "./RunHistoryTypes";

export function useRunHistoryState({
  runs,
  selectedRunId,
}: {
  runs: YakuRunPageItem[];
  selectedRunId: string;
}) {
  const [runSearch, setRunSearch] = useState("");
  const [runStateFilter, setRunStateFilter] = useState<RunStateFilter>("all");
  const [runSort, setRunSort] = useState<RunSort>("newest");
  const [runErrorsOnly, setRunErrorsOnly] = useState(false);
  const [runCompareMode, setRunCompareMode] = useState<RunCompareMode>("previous");

  const filteredRuns = useMemo(
    () =>
      runs.filter((run) => {
        const normalizedSearch = runSearch.trim().toLowerCase();
        if (normalizedSearch === "") {
          return modelMatchesRunFilters(run, runStateFilter, runErrorsOnly);
        }
        return (
          modelMatchesRunFilters(run, runStateFilter, runErrorsOnly) &&
          modelBuildRunSearchText(run).includes(normalizedSearch)
        );
      }),
    [runErrorsOnly, runSearch, runStateFilter, runs],
  );
  const sortedRuns = useMemo(
    () => [...filteredRuns].sort((left, right) => modelCompareRunsBySort(left, right, runSort)),
    [filteredRuns, runSort],
  );
  const previousChronologicalRuns = useMemo(() => modelBuildPreviousRunMap(runs), [runs]);
  const completedRuns = sortedRuns.filter((run) => run.completedAt != null);
  const successfulRuns = sortedRuns.filter((run) => run.state === "completed");
  const failedRuns = sortedRuns.filter((run) => run.state === "failed");
  const runningRuns = sortedRuns.filter((run) => run.state === "running");
  const averageDurationMs = modelAverageRunDurationMs(completedRuns);
  const latestRun = sortedRuns[0] ?? null;
  const selectedRun: YakuRunPageItem | null =
    runs.find((run) => run.id === selectedRunId) ?? null;
  const comparisonTargets = useMemo(
    () =>
      selectedRun == null
        ? null
        : {
            previous: modelGetRunComparisonBase(runs, selectedRun, "previous"),
            last_success: modelGetRunComparisonBase(runs, selectedRun, "last_success"),
            last_failed: modelGetRunComparisonBase(runs, selectedRun, "last_failed"),
          },
    [runs, selectedRun],
  );
  const comparisonRun: YakuRunPageItem | null =
    selectedRun == null ? null : comparisonTargets?.[runCompareMode] ?? null;

  const selectedRunEventsQuery = useQuery({
    enabled: selectedRunId !== "",
    queryKey: ["yaku", "run-events", "compare", selectedRunId],
    queryFn: () => listYakuRunEvents(selectedRunId, null),
    placeholderData: (prev) => prev,
    refetchInterval: selectedRun?.state === "running" ? 750 : false,
  });
  const comparisonRunEventsQuery = useQuery({
    enabled: comparisonRun != null,
    queryKey: ["yaku", "run-events", "compare", comparisonRun?.id ?? ""],
    queryFn: () => listYakuRunEvents(comparisonRun!.id, null),
    placeholderData: (prev) => prev,
  });

  const selectedRunEventSummary = useMemo(
    () => modelBuildRunEventSummary(selectedRunEventsQuery.data?.items ?? []),
    [selectedRunEventsQuery.data?.items],
  );
  const comparisonRunEventSummary = useMemo(
    () => modelBuildRunEventSummary(comparisonRunEventsQuery.data?.items ?? []),
    [comparisonRunEventsQuery.data?.items],
  );
  const selectedRunProtocolSummary = useMemo(
    () => buildRunProtocolSummary(selectedRunEventsQuery.data?.items ?? []),
    [selectedRunEventsQuery.data?.items],
  );
  const comparisonRunProtocolSummary = useMemo(
    () => buildRunProtocolSummary(comparisonRunEventsQuery.data?.items ?? []),
    [comparisonRunEventsQuery.data?.items],
  );
  const selectedRunPayloadSummary = useMemo(
    () => buildRunPayloadSummary(selectedRunEventsQuery.data?.items ?? []),
    [selectedRunEventsQuery.data?.items],
  );
  const comparisonRunPayloadSummary = useMemo(
    () => buildRunPayloadSummary(comparisonRunEventsQuery.data?.items ?? []),
    [comparisonRunEventsQuery.data?.items],
  );
  const selectedRunFailureSummary = useMemo(
    () => buildRunFailureSummary(selectedRunEventsQuery.data?.items ?? []),
    [selectedRunEventsQuery.data?.items],
  );
  const comparisonRunFailureSummary = useMemo(
    () => buildRunFailureSummary(comparisonRunEventsQuery.data?.items ?? []),
    [comparisonRunEventsQuery.data?.items],
  );
  const eventSummaryReady =
    selectedRunEventsQuery.data != null &&
    (comparisonRun == null || comparisonRunEventsQuery.data != null);
  const successRate =
    filteredRuns.length === 0
      ? "0%"
      : `${Math.round((successfulRuns.length / filteredRuns.length) * 100)}%`;
  const comparisonLabel =
    comparisonRun == null
      ? "No comparison target for the current baseline."
      : `Target: ${modelFormatRunComparisonTarget(comparisonRun)}`;

  return {
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
  };
}
