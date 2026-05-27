import type { WebSocketMessageDraft } from "./requestConfigTypes";
import { createWebSocketMessage } from "./requestConfigFactories";
import { stringOrEmpty } from "./requestConfigSharedHelpers";

export function normalizedWebSocketMessageQueue(messages: WebSocketMessageDraft[]) {
  return messages.map((message) =>
    createWebSocketMessage({
      id: message.id,
      kind: message.kind,
      value: message.value,
      enabled: message.enabled !== false,
    }),
  );
}

export function webSocketMessageQueueFromConfig(config: Record<string, unknown>) {
  const configuredQueue = config.messageQueue;
  if (Array.isArray(configuredQueue)) {
    return configuredQueue
      .filter(
        (item): item is Record<string, unknown> =>
          item != null && typeof item === "object",
      )
      .map((item) =>
        createWebSocketMessage({
          kind:
            stringOrEmpty(item.kind) === "ping"
              ? "ping"
              : stringOrEmpty(item.kind) === "binary"
                ? "binary"
                : "text",
          value: stringOrEmpty(item.value),
          enabled: item.enabled !== false,
        }),
      );
  }

  if (!Array.isArray(config.messages)) {
    return [];
  }

  return config.messages
    .filter((message): message is string => typeof message === "string")
    .map((message) => createWebSocketMessage({ value: message }));
}
