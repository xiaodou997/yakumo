import { Button } from "../../components/core/Button";
import { VStack } from "../../components/core/Stacks";
import { CheckboxField, fieldClassName, textareaClassName } from "./RequestFieldPrimitives";
import type { WebSocketMessageDraft } from "./requestConfig";
import {
  webSocketBinaryLengthSummary,
  webSocketMessageDescription,
  webSocketMessagePlaceholder,
} from "./RequestRealtimeModel";
import { updateWebSocketMessageQueue, moveWebSocketMessage, removeWebSocketMessage } from "./RequestWebSocketQueueModel";

export function RequestWebSocketQueueItemCard({
  webSocketMessageQueue,
  message,
  index,
  onChange,
}: {
  webSocketMessageQueue: WebSocketMessageDraft[];
  message: WebSocketMessageDraft;
  index: number;
  onChange: (nextQueue: WebSocketMessageDraft[]) => void;
}) {
  const updateMessage = (patch: Partial<WebSocketMessageDraft>) => {
    onChange(updateWebSocketMessageQueue(webSocketMessageQueue, message.id, patch));
  };

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 p-2">
      <div className="grid gap-2 md:grid-cols-[auto_minmax(0,1fr)_auto]">
        <div className="rounded-md border border-border-subtle bg-surface px-2 py-2 text-[11px] text-text-subtle">
          #{index + 1}
        </div>
        <div className="space-y-2">
          <select
            value={message.kind}
            onChange={(event) =>
              updateMessage({
                kind:
                  event.target.value === "ping"
                    ? "ping"
                    : event.target.value === "binary"
                      ? "binary"
                      : "text",
              })
            }
            className={fieldClassName}
          >
            <option value="text">Text Frame</option>
            <option value="ping">Ping Frame</option>
            <option value="binary">Binary Frame</option>
          </select>
          <textarea
            value={message.value}
            onChange={(event) => updateMessage({ value: event.target.value })}
            rows={Math.max(2, Math.min(5, message.value.split(/\r?\n/).length || 2))}
            placeholder={webSocketMessagePlaceholder(message.kind)}
            className={textareaClassName}
          />
          <div className="text-[11px] text-text-subtle">
            {webSocketMessageDescription(message.kind)}
          </div>
        </div>
        <VStack space={2}>
          <Button
            size="2xs"
            variant="border"
            disabled={index === 0}
            onClick={() => onChange(moveWebSocketMessage(webSocketMessageQueue, message.id, -1))}
          >
            Up
          </Button>
          <Button
            size="2xs"
            variant="border"
            disabled={index === webSocketMessageQueue.length - 1}
            onClick={() => onChange(moveWebSocketMessage(webSocketMessageQueue, message.id, 1))}
          >
            Down
          </Button>
          <Button
            size="2xs"
            variant="border"
            color="danger"
            onClick={() => onChange(removeWebSocketMessage(webSocketMessageQueue, message.id))}
          >
            Remove
          </Button>
        </VStack>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <CheckboxField
          checked={message.enabled !== false}
          onChange={(checked) => updateMessage({ enabled: checked })}
        >
          Send this frame
        </CheckboxField>
        <div className="text-[11px] text-text-subtle">
          {message.value.trim() === ""
            ? "Empty frames are ignored at send time."
            : message.kind === "binary"
              ? webSocketBinaryLengthSummary(message.value)
              : `${message.value.length} chars`}
        </div>
      </div>
    </div>
  );
}
