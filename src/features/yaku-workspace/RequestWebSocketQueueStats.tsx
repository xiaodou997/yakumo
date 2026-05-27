import { StatChip } from "./RequestProtocolCommon";
import type { WebSocketMessageDraft } from "./requestConfig";
import { countWebSocketMessageKinds, enabledWebSocketMessages } from "./RequestWebSocketQueueModel";

export function RequestWebSocketQueueStats({
  webSocketMessageQueue,
}: {
  webSocketMessageQueue: WebSocketMessageDraft[];
}) {
  const enabledOutboundMessages = enabledWebSocketMessages(webSocketMessageQueue);
  const kinds = countWebSocketMessageKinds(webSocketMessageQueue);

  return (
    <div className="grid gap-2 md:grid-cols-3">
      <StatChip label="Queued Frames" value={String(webSocketMessageQueue.length)} />
      <StatChip label="Enabled Frames" value={String(enabledOutboundMessages.length)} />
      <StatChip
        label="Kinds"
        value={`text ${kinds.text} · ping ${kinds.ping} · binary ${kinds.binary}`}
        truncate
      />
    </div>
  );
}
