import { VStack } from "../../components/core/Stacks";
import { RequestSseSection } from "./RequestSseSection";
import { RequestWebSocketHandshakeSection } from "./RequestWebSocketHandshakeSection";
import { RequestWebSocketLimitsSection } from "./RequestWebSocketLimitsSection";
import { RequestWebSocketQueueSection } from "./RequestWebSocketQueueSection";
import type {
  RequestSseSectionProps,
  RequestWebSocketHandshakeSectionProps,
  RequestWebSocketLimitsSectionProps,
  RequestWebSocketQueueSectionProps,
} from "./RequestRealtimeTypes";

export function SseFields(props: RequestSseSectionProps) {
  return <RequestSseSection {...props} />;
}

export function WebSocketFields({
  headers,
  setHeaders,
  query,
  setQuery,
  webSocketMessageQueue,
  setWebSocketMessageQueue,
  webSocketMaxMessages,
  setWebSocketMaxMessages,
  timeoutMs,
  setTimeoutMs,
}: RequestWebSocketHandshakeSectionProps &
  RequestWebSocketQueueSectionProps &
  RequestWebSocketLimitsSectionProps) {
  return (
    <VStack space={2}>
      <RequestWebSocketHandshakeSection
        headers={headers}
        setHeaders={setHeaders}
        query={query}
        setQuery={setQuery}
      />
      <RequestWebSocketQueueSection
        webSocketMessageQueue={webSocketMessageQueue}
        setWebSocketMessageQueue={setWebSocketMessageQueue}
      />
      <RequestWebSocketLimitsSection
        webSocketMaxMessages={webSocketMaxMessages}
        setWebSocketMaxMessages={setWebSocketMaxMessages}
        timeoutMs={timeoutMs}
        setTimeoutMs={setTimeoutMs}
      />
    </VStack>
  );
}
