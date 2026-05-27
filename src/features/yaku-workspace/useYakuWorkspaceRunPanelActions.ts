import { useCallback } from "react";
import type { YakuRunEventKind } from "../../lib/yaku-client";

export function useYakuWorkspaceRunPanelActions({
  setSearch,
  setEventKind,
  setSelectedRunEventId,
  setEventFocusContextLabel,
}: {
  setSearch: (patch: { runId?: string; requestId?: string; folderId?: string }) => void;
  setEventKind: (kind: "all" | YakuRunEventKind) => void;
  setSelectedRunEventId: (eventId: number | null) => void;
  setEventFocusContextLabel: (label: string | null) => void;
}) {
  const handleSelectRun = useCallback(
    (runId: string) => {
      setEventFocusContextLabel(null);
      setSearch({ runId });
    },
    [setEventFocusContextLabel, setSearch],
  );

  const handleOpenEvent = useCallback(
    (eventId: number, contextLabel?: string) => {
      setEventKind("all");
      setSelectedRunEventId(eventId);
      setEventFocusContextLabel(contextLabel ?? null);
    },
    [setEventFocusContextLabel, setEventKind, setSelectedRunEventId],
  );

  const handleOpenRunEvent = useCallback(
    (runId: string, eventId: number, contextLabel?: string) => {
      setSearch({ runId });
      setEventKind("all");
      setSelectedRunEventId(eventId);
      setEventFocusContextLabel(contextLabel ?? null);
    },
    [setEventFocusContextLabel, setEventKind, setSearch, setSelectedRunEventId],
  );

  const handleClearEventFocus = useCallback(() => {
    setSelectedRunEventId(null);
    setEventFocusContextLabel(null);
  }, [setEventFocusContextLabel, setSelectedRunEventId]);

  const handleTimelineEventKind = useCallback(
    (kind: "all" | YakuRunEventKind) => {
      setEventFocusContextLabel(null);
      setEventKind(kind);
    },
    [setEventFocusContextLabel, setEventKind],
  );

  const handleSelectTimelineEvent = useCallback(
    (eventId: number) => {
      setEventFocusContextLabel(null);
      setSelectedRunEventId(eventId);
    },
    [setEventFocusContextLabel, setSelectedRunEventId],
  );

  return {
    handleSelectRun,
    handleOpenEvent,
    handleOpenRunEvent,
    handleClearEventFocus,
    handleTimelineEventKind,
    handleSelectTimelineEvent,
  };
}
