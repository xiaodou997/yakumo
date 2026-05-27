import { Checkbox } from "../../components/core/Checkbox";
import { Select } from "../../components/core/Select";
import { HStack } from "../../components/core/Stacks";
import type { RunCompareMode, RunSort, RunStateFilter } from "./RunHistoryTypes";

export function RunHistoryControls({
  runSearch,
  runStateFilter,
  runSort,
  runErrorsOnly,
  runCompareMode,
  runCount,
  filteredRunCount,
  comparisonLabel,
  onChangeRunSearch,
  onChangeRunStateFilter,
  onChangeRunSort,
  onChangeRunErrorsOnly,
  onChangeRunCompareMode,
}: {
  runSearch: string;
  runStateFilter: RunStateFilter;
  runSort: RunSort;
  runErrorsOnly: boolean;
  runCompareMode: RunCompareMode;
  runCount: number;
  filteredRunCount: number;
  comparisonLabel: string;
  onChangeRunSearch: (value: string) => void;
  onChangeRunStateFilter: (value: RunStateFilter) => void;
  onChangeRunSort: (value: RunSort) => void;
  onChangeRunErrorsOnly: (value: boolean) => void;
  onChangeRunCompareMode: (value: RunCompareMode) => void;
}) {
  return (
    <>
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_12rem_12rem_auto] md:items-end">
        <div>
          <div className="mb-1 text-xs uppercase tracking-[0.18em] text-text-subtlest">
            Search
          </div>
          <input
            value={runSearch}
            onChange={(event) => onChangeRunSearch(event.target.value)}
            placeholder="Search state, status, error, run id..."
            className="min-h-sm w-full rounded-md border border-border-subtle bg-surface px-2 text-xs font-mono text-text outline-none focus:border-border-focus"
          />
        </div>
        <Select
          name="yaku-run-state-filter"
          label="State"
          value={runStateFilter}
          options={[
            { label: "All States", value: "all" },
            { label: "Completed", value: "completed" },
            { label: "Failed", value: "failed" },
            { label: "Running", value: "running" },
            { label: "Cancelled", value: "cancelled" },
            { label: "Created", value: "created" },
          ]}
          onChange={(value) => onChangeRunStateFilter(value as RunStateFilter)}
          size="sm"
        />
        <Select
          name="yaku-run-sort"
          label="Sort"
          value={runSort}
          options={[
            { label: "Newest First", value: "newest" },
            { label: "Oldest First", value: "oldest" },
            { label: "Slowest First", value: "slowest" },
            { label: "Fastest First", value: "fastest" },
          ]}
          onChange={(value) => onChangeRunSort(value as RunSort)}
          size="sm"
        />
        <div className="text-[11px] text-text-subtle">
          {filteredRunCount} of {runCount}
        </div>
      </div>
      <HStack justifyContent="between" alignItems="center" className="gap-2">
        <Checkbox
          checked={runErrorsOnly}
          onChange={onChangeRunErrorsOnly}
          title="Errors only"
        />
        <Select
          name="yaku-run-compare"
          label="Compare"
          value={runCompareMode}
          options={[
            { label: "Previous Run", value: "previous" },
            { label: "Last Success", value: "last_success" },
            { label: "Last Failed", value: "last_failed" },
          ]}
          onChange={(value) => onChangeRunCompareMode(value as RunCompareMode)}
          size="sm"
        />
        <div className="text-[11px] text-text-subtle">{comparisonLabel}</div>
      </HStack>
    </>
  );
}
