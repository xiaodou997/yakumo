import { Button } from "../../components/core/Button";
import { createWebSocketMessage, type WebSocketMessageDraft } from "./requestConfig";

export function RequestWebSocketQueueToolbar({
  webSocketMessageQueue,
  setWebSocketMessageQueue,
}: {
  webSocketMessageQueue: WebSocketMessageDraft[];
  setWebSocketMessageQueue: (value: WebSocketMessageDraft[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="2xs"
        variant="border"
        onClick={() =>
          setWebSocketMessageQueue([...webSocketMessageQueue, createWebSocketMessage()])
        }
      >
        Add Frame
      </Button>
      <Button
        size="2xs"
        variant="border"
        onClick={() =>
          setWebSocketMessageQueue([
            ...webSocketMessageQueue,
            createWebSocketMessage({ value: "ping" }),
          ])
        }
      >
        Add Ping Frame
      </Button>
      <Button
        size="2xs"
        variant="border"
        onClick={() =>
          setWebSocketMessageQueue([
            ...webSocketMessageQueue,
            createWebSocketMessage({ kind: "binary", value: "00ff" }),
          ])
        }
      >
        Add Binary Frame
      </Button>
      <Button
        size="2xs"
        variant="border"
        onClick={() => setWebSocketMessageQueue([])}
      >
        Clear Frames
      </Button>
    </div>
  );
}
