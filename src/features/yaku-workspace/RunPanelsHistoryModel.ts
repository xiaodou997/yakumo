import type { YakuRunPageItem } from "../../lib/yaku-client";

export function buildPreviousRunMap(runs: YakuRunPageItem[]) {
  const chronologicalRuns = [...runs].sort(
    (left, right) =>
      new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
  );
  const map = new Map<string, YakuRunPageItem>();
  chronologicalRuns.forEach((run, index) => {
    const previousRun = chronologicalRuns[index + 1];
    if (previousRun != null) {
      map.set(run.id, previousRun);
    }
  });
  return map;
}

export function getRunComparisonBase(
  runs: YakuRunPageItem[],
  current: YakuRunPageItem,
  mode: "previous" | "last_success" | "last_failed",
) {
  const chronologicalRuns = [...runs].sort(
    (left, right) =>
      new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
  );
  const currentIndex = chronologicalRuns.findIndex((run) => run.id === current.id);
  if (currentIndex < 0) {
    return null;
  }
  if (mode === "previous") {
    return chronologicalRuns[currentIndex + 1] ?? null;
  }
  for (let index = currentIndex + 1; index < chronologicalRuns.length; index += 1) {
    const candidate = chronologicalRuns[index];
    if (candidate == null) {
      continue;
    }
    if (mode === "last_success" && candidate.state === "completed") {
      return candidate;
    }
    if (mode === "last_failed" && candidate.state === "failed") {
      return candidate;
    }
  }
  return null;
}

export function buildRunSearchText(run: YakuRunPageItem) {
  return [
    run.id,
    run.state,
    run.statusCode ?? "",
    run.error ?? "",
    run.startedAt,
    run.completedAt ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function matchesRunFilters(
  run: YakuRunPageItem,
  stateFilter: "all" | YakuRunPageItem["state"],
  errorsOnly: boolean,
) {
  if (stateFilter !== "all" && run.state !== stateFilter) {
    return false;
  }
  if (errorsOnly && run.error == null) {
    return false;
  }
  return true;
}

export function compareRunsBySort(
  left: YakuRunPageItem,
  right: YakuRunPageItem,
  sort: "newest" | "oldest" | "slowest" | "fastest",
) {
  const leftStarted = new Date(left.startedAt).getTime();
  const rightStarted = new Date(right.startedAt).getTime();
  const leftDuration = runDurationMs(left);
  const rightDuration = runDurationMs(right);

  if (sort === "oldest") {
    return leftStarted - rightStarted;
  }
  if (sort === "slowest") {
    if (leftDuration != null && rightDuration != null && leftDuration !== rightDuration) {
      return rightDuration - leftDuration;
    }
    if (leftDuration == null && rightDuration != null) {
      return 1;
    }
    if (leftDuration != null && rightDuration == null) {
      return -1;
    }
    return rightStarted - leftStarted;
  }
  if (sort === "fastest") {
    if (leftDuration != null && rightDuration != null && leftDuration !== rightDuration) {
      return leftDuration - rightDuration;
    }
    if (leftDuration == null && rightDuration != null) {
      return 1;
    }
    if (leftDuration != null && rightDuration == null) {
      return -1;
    }
    return rightStarted - leftStarted;
  }
  return rightStarted - leftStarted;
}

export function compareRuns(current: YakuRunPageItem, previous: YakuRunPageItem) {
  const currentDuration = runDurationMs(current);
  const previousDuration = runDurationMs(previous);
  if (current.statusCode !== previous.statusCode) {
    return `status changed from ${previous.statusCode ?? "none"}`;
  }
  if (current.state !== previous.state) {
    return `state changed from ${previous.state}`;
  }
  if (currentDuration != null && previousDuration != null) {
    const delta = currentDuration - previousDuration;
    if (delta === 0) {
      return "same duration as previous";
    }
    const direction = delta > 0 ? "+" : "-";
    return `${direction}${formatDurationMs(Math.abs(delta))} vs previous`;
  }
  return "compared with previous run";
}

export function averageRunDurationMs(runs: YakuRunPageItem[]) {
  const durations = runs
    .map((run) => runDurationMs(run))
    .filter((duration): duration is number => duration != null);
  if (durations.length === 0) {
    return null;
  }
  return Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length);
}

export function runDurationMs(run: YakuRunPageItem) {
  if (run.completedAt == null) {
    return null;
  }
  const startedAt = new Date(run.startedAt).getTime();
  const completedAt = new Date(run.completedAt).getTime();
  if (Number.isNaN(startedAt) || Number.isNaN(completedAt)) {
    return null;
  }
  return Math.max(0, completedAt - startedAt);
}

export function formatDurationMs(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }
  if (durationMs < 60_000) {
    return `${(durationMs / 1000).toFixed(1)} s`;
  }
  return `${(durationMs / 60_000).toFixed(1)} min`;
}

export function formatRunTiming(run: YakuRunPageItem) {
  if (run.completedAt == null) {
    return run.state === "running" ? "running" : "not completed";
  }
  const durationMs = runDurationMs(run);
  return durationMs == null ? "completed" : formatDurationMs(durationMs);
}

export function formatRunComparisonTarget(run: YakuRunPageItem) {
  const parts: string[] = [run.state];
  if (run.statusCode != null) {
    parts.push(String(run.statusCode));
  }
  parts.push(formatRunTiming(run));
  return parts.join(" · ");
}

export function formatRunComparisonModeLabel(mode: "previous" | "last_success" | "last_failed") {
  if (mode === "last_success") {
    return "Last successful run";
  }
  if (mode === "last_failed") {
    return "Last failed run";
  }
  return "Previous run";
}

export function buildPreviousRunMapLabel() {
  return "previous";
}
