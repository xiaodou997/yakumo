import type { RequestWebSocketQueueSectionProps } from "./RequestRealtimeTypes";
import { ProtocolSection, StatChip } from "./RequestProtocolCommon";
import { RequestWebSocketQueueList } from "./RequestWebSocketQueueList";
import { RequestWebSocketQueueStats } from "./RequestWebSocketQueueStats";
import { RequestWebSocketQueueToolbar } from "./RequestWebSocketQueueToolbar";

export function RequestWebSocketQueueSection({
  webSocketMessageQueue,
  setWebSocketMessageQueue,
}: RequestWebSocketQueueSectionProps) {
  return (
    <ProtocolSection
      title="Outbound Messages"
      description="Queue text frames in send order. Disabled or empty frames stay in the editor but are omitted from the send payload."
    >
      <RequestWebSocketQueueStats webSocketMessageQueue={webSocketMessageQueue} />
      <RequestWebSocketQueueToolbar
        webSocketMessageQueue={webSocketMessageQueue}
        setWebSocketMessageQueue={setWebSocketMessageQueue}
      />
      <RequestWebSocketQueueList
        webSocketMessageQueue={webSocketMessageQueue}
        setWebSocketMessageQueue={setWebSocketMessageQueue}
      />
    </ProtocolSection>
  );
}
