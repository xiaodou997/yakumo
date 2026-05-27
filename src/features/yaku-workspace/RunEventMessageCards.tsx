import { VStack } from "../../components/core/Stacks";
import { EventStatChip } from "./RunPanelsCompareShared";

export function ErrorEventCard({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-danger">Error</div>
      <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-xs text-text-subtle">
        {message}
      </pre>
    </div>
  );
}

export function WebSocketMessageEventCard({
  event,
}: {
  event: {
    direction: string;
    kind: string;
    messageIndex: number | null;
    directionIndex: number | null;
    byteLength: number | null;
    text: string | null;
    hex: string | null;
  };
}) {
  return (
    <VStack space={2}>
      <div className="grid gap-2 md:grid-cols-4">
        <EventStatChip
          label="Direction"
          value={event.directionIndex == null ? event.direction : `${event.direction} #${event.directionIndex}`}
        />
        <EventStatChip label="Kind" value={event.kind} />
        <EventStatChip
          label="Frame"
          value={event.messageIndex == null ? "unknown" : `#${event.messageIndex}`}
        />
        <EventStatChip
          label="Bytes"
          value={event.byteLength == null ? "unknown" : event.byteLength.toLocaleString()}
        />
      </div>
      {event.text != null && event.text !== "" ? (
        <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">Text</div>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-xs text-text-subtle">
            {event.text}
          </pre>
        </div>
      ) : null}
      {event.hex != null && event.hex !== "" ? (
        <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">Hex</div>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all text-xs text-text-subtle">
            {event.hex}
          </pre>
        </div>
      ) : null}
    </VStack>
  );
}
