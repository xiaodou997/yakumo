import type { YakuWorkspaceRightColumnProps } from "./YakuWorkspaceRightColumnTypes";

export function buildYakuWorkspaceRightColumnProps({
  queries,
  nav,
  runActions,
}: YakuWorkspaceRightColumnProps) {
  const timelineProps = {
    eventKind: nav.eventKind,
    setEventKind: runActions.handleTimelineEventKind,
    events: queries.runEventsQuery.data?.items ?? [],
    error: queries.runEventsQuery.error,
    focusContextLabel: nav.eventFocusContextLabel,
    onClearFocusContext: () => nav.setEventFocusContextLabel(null),
    selectedEventId: nav.selectedRunEventId,
    onSelectEvent: runActions.handleSelectTimelineEvent,
  };

  const bodyViewerProps = {
    bodies: queries.runBodies,
    selectedBodyId: nav.selectedBodyId,
    setSelectedBodyId: nav.setSelectedBodyId,
    bodyBytes: queries.runBodyBytesQuery.data,
    isLoading: queries.runBodyBytesQuery.isFetching,
    error: queries.runBodyBytesQuery.error,
  };

  return {
    timelineProps,
    bodyViewerProps,
  };
}
