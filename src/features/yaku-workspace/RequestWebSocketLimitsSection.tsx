import { NumberFieldWithPresets, ProtocolSection, TimeoutField } from "./RequestProtocolCommon";
import type { RequestWebSocketLimitsSectionProps } from "./RequestRealtimeTypes";

export function RequestWebSocketLimitsSection({
  webSocketMaxMessages,
  setWebSocketMaxMessages,
  timeoutMs,
  setTimeoutMs,
}: RequestWebSocketLimitsSectionProps) {
  return (
    <ProtocolSection
      title="Connection Limits"
      description="The client closes after receiving the configured number of inbound messages, or when the timeout is reached."
    >
      <NumberFieldWithPresets
        label="Max Received Messages"
        value={webSocketMaxMessages}
        onChange={setWebSocketMaxMessages}
        placeholder="1"
        presets={[
          { label: "1", value: "1" },
          { label: "5", value: "5" },
          { label: "20", value: "20" },
        ]}
        description="Inbound message capture limit before the run completes."
      />
      <TimeoutField
        value={timeoutMs}
        onChange={setTimeoutMs}
        description="Connection timeout and receive wait budget in milliseconds."
      />
    </ProtocolSection>
  );
}
