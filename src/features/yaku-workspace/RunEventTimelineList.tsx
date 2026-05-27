import { EmptyCopy } from "./WorkspacePanels";
import type { YakuRunEvent } from "../../lib/yaku-client";
import { RunEventTimelineItem } from "./RunEventTimelineItem";

export function RunEventTimelineList({
  events,
  selectedEventId,
  onSelectEvent,
}: {
  events: YakuRunEvent[];
  selectedEventId: number | null;
  onSelectEvent: (eventId: number) => void;
}) {
  if (events.length === 0) {
    return <EmptyCopy>No events available for this run and filter.</EmptyCopy>;
  }

  return (
    <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
      {events.map((event) => (
        <RunEventTimelineItem
          key={event.id}
          event={event}
          isActive={selectedEventId != null && event.id === selectedEventId}
          onSelectEvent={onSelectEvent}
        />
      ))}
    </div>
  );
}
