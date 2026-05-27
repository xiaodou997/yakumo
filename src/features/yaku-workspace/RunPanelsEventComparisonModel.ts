import type { YakuRunEventKind } from "../../lib/yaku-client";
import type { RunEventComparison, RunEventSummary } from "./RunPanelsComparisonTypes";

const RUN_EVENT_KIND_VALUES = [
  "request_headers",
  "request_body",
  "response_headers",
  "response_body",
  "message",
  "error",
  "complete",
] as const satisfies readonly YakuRunEventKind[];

export function buildRunEventSummary(events: Array<{ id: number; kind: YakuRunEventKind }>): RunEventSummary {
  const counts = Object.fromEntries(
    RUN_EVENT_KIND_VALUES.map((value) => [value, 0]),
  ) as Record<YakuRunEventKind, number>;
  const latestEventIds: Partial<Record<YakuRunEventKind, number>> = {};
  for (const event of events) {
    counts[event.kind] = (counts[event.kind] ?? 0) + 1;
    latestEventIds[event.kind] = event.id;
  }
  return {
    total: events.length,
    counts,
    latestEventIds,
  };
}

export function compareRunEventSummaries(
  current: RunEventSummary,
  base: RunEventSummary,
): RunEventComparison {
  const diffs = RUN_EVENT_KIND_VALUES.flatMap((value) => {
    const currentCount = current.counts[value] ?? 0;
    const baseCount = base.counts[value] ?? 0;
    if (currentCount === baseCount) {
      return [];
    }
    const delta = currentCount - baseCount;
    return [
      {
        kind: value,
        currentCount,
        baseCount,
        currentEventId: current.latestEventIds[value] ?? null,
        baseEventId: base.latestEventIds[value] ?? null,
        deltaLabel: `${delta >= 0 ? "+" : ""}${delta}`,
        deltaClassName: delta > 0 ? "text-success" : "text-danger",
      },
    ];
  }).sort((left, right) => {
    const leftDelta = Math.abs(left.currentCount - left.baseCount);
    const rightDelta = Math.abs(right.currentCount - right.baseCount);
    return rightDelta - leftDelta;
  });

  const changedKinds = diffs.length;
  const newKinds = diffs.filter((entry) => entry.baseCount === 0 && entry.currentCount > 0).length;
  const removedKinds = diffs.filter((entry) => entry.currentCount === 0 && entry.baseCount > 0).length;

  return {
    total: `${base.total} → ${current.total}`,
    changedKinds: String(changedKinds),
    newKinds: String(newKinds),
    removedKinds: String(removedKinds),
    diffs,
  };
}
