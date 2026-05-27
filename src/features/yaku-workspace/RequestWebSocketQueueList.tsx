import { VStack } from "../../components/core/Stacks";
import { EmptyCopy } from "./WorkspacePanels";
import type { WebSocketMessageDraft } from "./requestConfig";
import { RequestWebSocketQueueItemCard } from "./RequestWebSocketQueueItemCard";

export function RequestWebSocketQueueList({
  webSocketMessageQueue,
  setWebSocketMessageQueue,
}: {
  webSocketMessageQueue: WebSocketMessageDraft[];
  setWebSocketMessageQueue: (value: WebSocketMessageDraft[]) => void;
}) {
  if (webSocketMessageQueue.length === 0) {
    return <EmptyCopy>No outbound frames queued.</EmptyCopy>;
  }

  return (
    <VStack space={2}>
      {webSocketMessageQueue.map((message, index) => (
        <RequestWebSocketQueueItemCard
          key={message.id}
          webSocketMessageQueue={webSocketMessageQueue}
          message={message}
          index={index}
          onChange={setWebSocketMessageQueue}
        />
      ))}
    </VStack>
  );
}
