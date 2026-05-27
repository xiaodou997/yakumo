import classNames from "classnames";
import { Button } from "../../components/core/Button";
import { HStack } from "../../components/core/Stacks";

export function EventStatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-2 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">{label}</div>
      <div className="mt-1 break-words text-xs text-text">{value}</div>
    </div>
  );
}

export function ComparisonJumpChip({
  label,
  value,
  onOpenCurrent,
  onOpenBaseline,
}: {
  label: string;
  value: string;
  onOpenCurrent: (() => void) | null;
  onOpenBaseline: (() => void) | null;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-2 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">{label}</div>
      <div className="mt-1 break-words text-xs text-text">{value}</div>
      <HStack space={1} className="mt-2">
        {onOpenCurrent != null ? (
          <Button size="2xs" type="button" variant="border" onClick={onOpenCurrent}>
            Current
          </Button>
        ) : null}
        {onOpenBaseline != null ? (
          <Button size="2xs" type="button" variant="border" onClick={onOpenBaseline}>
            Baseline
          </Button>
        ) : null}
      </HStack>
    </div>
  );
}

export function EventSignalChip({
  label,
  value,
  eventId,
  onOpenEvent,
  openContextLabel,
  isActive,
}: {
  label: string;
  value: string;
  eventId: number | null;
  onOpenEvent: (eventId: number, contextLabel?: string) => void;
  openContextLabel?: string;
  isActive: boolean;
}) {
  return (
    <div
      className={classNames(
        "rounded-lg border px-2 py-2",
        isActive
          ? "border-border-focus bg-surface-highlight/50"
          : "border-border-subtle bg-surface-highlight/35",
      )}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">{label}</div>
      <div className="mt-1 break-words text-xs text-text">{value}</div>
      <button
        type="button"
        disabled={eventId == null}
        onClick={() => {
          if (eventId != null) {
            onOpenEvent(eventId, openContextLabel);
          }
        }}
        className={classNames(
          "mt-2 text-[11px] font-medium",
          eventId == null
            ? "cursor-not-allowed text-text-subtlest"
            : "text-text-subtle hover:text-text",
        )}
      >
        {eventId == null ? "No event" : "Open in Timeline"}
      </button>
    </div>
  );
}
