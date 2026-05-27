import { useEffect, useMemo, useState } from "react";
import { FormattedError } from "../../components/core/FormattedError";
import { VStack } from "../../components/core/Stacks";
import { type YakuRunEvent, type YakuRunEventKind } from "../../lib/yaku-client";
import { buildRunEventSearchText } from "./RunEventFormatters";
import { EmptyCopy, WorkspacePanel } from "./WorkspacePanels";
import { RunEventTimelineControls } from "./RunEventTimelineControls";
import { RunEventTimelineList } from "./RunEventTimelineList";
import { RunEventTimelineNotice } from "./RunEventTimelineNotice";

export function RunEventTimelinePanel({
  eventKind,
  setEventKind,
  events,
  error,
  focusContextLabel,
  onClearFocusContext,
  selectedEventId,
  onSelectEvent,
}: {
  eventKind: "all" | YakuRunEventKind;
  setEventKind: (kind: "all" | YakuRunEventKind) => void;
  events: YakuRunEvent[];
  error: unknown;
  focusContextLabel: string | null;
  onClearFocusContext: () => void;
  selectedEventId: number | null;
  onSelectEvent: (eventId: number) => void;
}) {
  const [eventSearch, setEventSearch] = useState("");
  const hasTimelineFilters = eventKind !== "all" || eventSearch.trim() !== "";
  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const normalizedSearch = eventSearch.trim().toLowerCase();
        if (normalizedSearch === "") {
          return true;
        }
        return buildRunEventSearchText(event).includes(normalizedSearch);
      }),
    [eventSearch, events],
  );
  const hasSelectedEvent =
    selectedEventId != null && filteredEvents.some((event) => event.id === selectedEventId);

  useEffect(() => {
    if (selectedEventId == null || !hasSelectedEvent) {
      return;
    }
    const element = document.getElementById(`yaku-run-event-${selectedEventId}`);
    element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [hasSelectedEvent, selectedEventId]);

  return (
    <WorkspacePanel title="Event Timeline" subtitle="Unified run events emitted by the Yaku engine.">
      <VStack space={3}>
        <RunEventTimelineControls
          eventKind={eventKind}
          setEventKind={setEventKind}
          eventSearch={eventSearch}
          setEventSearch={setEventSearch}
          filteredCount={filteredEvents.length}
          totalCount={events.length}
        />
        <RunEventTimelineNotice
          focusContextLabel={focusContextLabel}
          onClearFocusContext={onClearFocusContext}
          selectedEventIsHidden={selectedEventId != null && !hasSelectedEvent}
          hasTimelineFilters={hasTimelineFilters}
          onShowSelectedEvent={() => {
            setEventSearch("");
            setEventKind("all");
          }}
        />
        {error ? (
          <FormattedError>{String(error)}</FormattedError>
        ) : filteredEvents.length === 0 ? (
          <EmptyCopy>No events available for this run and filter.</EmptyCopy>
        ) : (
          <RunEventTimelineList
            events={filteredEvents}
            selectedEventId={selectedEventId}
            onSelectEvent={onSelectEvent}
          />
        )}
      </VStack>
    </WorkspacePanel>
  );
}
