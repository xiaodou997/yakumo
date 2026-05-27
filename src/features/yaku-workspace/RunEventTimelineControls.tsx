import { Select } from "../../components/core/Select";
import { YAKU_RUN_EVENT_KIND_OPTIONS, type YakuRunEventKind } from "../../lib/yaku-client";

export function RunEventTimelineControls({
  eventKind,
  setEventKind,
  eventSearch,
  setEventSearch,
  filteredCount,
  totalCount,
}: {
  eventKind: "all" | YakuRunEventKind;
  setEventKind: (kind: "all" | YakuRunEventKind) => void;
  eventSearch: string;
  setEventSearch: (value: string) => void;
  filteredCount: number;
  totalCount: number;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-[14rem_minmax(0,1fr)_auto] md:items-end">
      <Select
        name="yaku-event-kind"
        label="Filter"
        value={eventKind}
        options={YAKU_RUN_EVENT_KIND_OPTIONS}
        onChange={(value) => setEventKind(value as "all" | YakuRunEventKind)}
      />
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.18em] text-text-subtlest">
          Search
        </div>
        <input
          value={eventSearch}
          onChange={(event) => setEventSearch(event.target.value)}
          placeholder="Search title, payload, service, URL..."
          className="min-h-sm w-full rounded-md border border-border-subtle bg-surface px-2 text-xs font-mono text-text outline-none focus:border-border-focus"
        />
      </div>
      <div className="text-[11px] text-text-subtle">
        {filteredCount} of {totalCount}
      </div>
    </div>
  );
}
