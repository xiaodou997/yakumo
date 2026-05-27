import classNames from "classnames";
import { HStack } from "../../components/core/Stacks";
import type { YakuRunEvent } from "../../lib/yaku-client";
import { formatRunEventTitle } from "./RunEventFormatters";
import {
  parseErrorMessageEvent,
  parseGrpcMessageEvent,
  parseGrpcRequestHeaderEvent,
  parseRequestBodyEvent,
  parseWebSocketMessageEvent,
} from "./RunEventParser";
import { renderRunEventDetails } from "./RunEventCards";

export function RunEventTimelineItem({
  event,
  isActive,
  onSelectEvent,
}: {
  event: YakuRunEvent;
  isActive: boolean;
  onSelectEvent: (eventId: number) => void;
}) {
  const websocketMessage = parseWebSocketMessageEvent(event);
  const grpcRequestHeaderEvent = parseGrpcRequestHeaderEvent(event);
  const requestBodyEvent = parseRequestBodyEvent(event);
  const grpcMessageEvent = parseGrpcMessageEvent(event);
  const errorEvent = parseErrorMessageEvent(event);

  return (
    <div
      id={`yaku-run-event-${event.id}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelectEvent(event.id)}
      onKeyDown={(keyEvent) => {
        if (keyEvent.key === "Enter" || keyEvent.key === " ") {
          keyEvent.preventDefault();
          onSelectEvent(event.id);
        }
      }}
      className={classNames(
        "rounded-xl border px-3 py-3 outline-none transition-colors",
        isActive
          ? "border-border-focus bg-surface-highlight/50 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
          : "border-border-subtle bg-surface hover:border-border",
      )}
    >
      <HStack justifyContent="between" alignItems="start" className="gap-3">
        <div className="font-medium text-text">
          {formatRunEventTitle(
            event,
            websocketMessage,
            grpcRequestHeaderEvent,
            requestBodyEvent,
            grpcMessageEvent,
            errorEvent,
          )}
        </div>
        <div className="text-xs text-text-subtlest">#{event.sequence}</div>
      </HStack>
      <div className="mt-1 text-xs text-text-subtlest">
        {new Date(event.createdAt).toLocaleString()}
      </div>
      <div className="mt-3">
        {renderRunEventDetails(
          event,
          websocketMessage,
          grpcRequestHeaderEvent,
          requestBodyEvent,
          grpcMessageEvent,
          errorEvent,
        )}
      </div>
    </div>
  );
}
