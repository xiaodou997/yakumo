import { Button } from "../../components/core/Button";

export function RunEventTimelineNotice({
  focusContextLabel,
  onClearFocusContext,
  selectedEventIsHidden,
  hasTimelineFilters,
  onShowSelectedEvent,
}: {
  focusContextLabel: string | null;
  onClearFocusContext: () => void;
  selectedEventIsHidden: boolean;
  hasTimelineFilters: boolean;
  onShowSelectedEvent: () => void;
}) {
  return (
    <>
      {focusContextLabel != null ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-highlight/35 px-3 py-2 text-xs text-text-subtle">
          <div>Compare jump: {focusContextLabel}</div>
          <button
            type="button"
            onClick={onClearFocusContext}
            className="font-medium text-text-subtle hover:text-text"
          >
            Clear Context
          </button>
        </div>
      ) : null}
      {selectedEventIsHidden ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-highlight/35 px-3 py-2 text-xs text-text-subtle">
          <div>Selected event is hidden by the current filter or search.</div>
          {hasTimelineFilters ? (
            <Button size="2xs" type="button" variant="border" onClick={onShowSelectedEvent}>
              Show Selected Event
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
