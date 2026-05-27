import type { WebSocketMessageDraft } from "./requestConfig";

export function enabledWebSocketMessages(
  webSocketMessageQueue: WebSocketMessageDraft[],
) {
  return webSocketMessageQueue.filter(
    (message) => message.enabled !== false && message.value.trim() !== "",
  );
}

export function countWebSocketMessageKinds(
  webSocketMessageQueue: WebSocketMessageDraft[],
) {
  return {
    text: webSocketMessageQueue.filter((message) => message.kind === "text").length,
    ping: webSocketMessageQueue.filter((message) => message.kind === "ping").length,
    binary: webSocketMessageQueue.filter((message) => message.kind === "binary").length,
  };
}

export function updateWebSocketMessageQueue(
  webSocketMessageQueue: WebSocketMessageDraft[],
  id: string,
  patch: Partial<WebSocketMessageDraft>,
) {
  return webSocketMessageQueue.map((message) =>
    message.id === id ? { ...message, ...patch } : message,
  );
}

export function removeWebSocketMessage(
  webSocketMessageQueue: WebSocketMessageDraft[],
  id: string,
) {
  return webSocketMessageQueue.filter((message) => message.id !== id);
}

export function moveWebSocketMessage(
  webSocketMessageQueue: WebSocketMessageDraft[],
  id: string,
  direction: -1 | 1,
) {
  const index = webSocketMessageQueue.findIndex((message) => message.id === id);
  if (index < 0) {
    return webSocketMessageQueue;
  }
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= webSocketMessageQueue.length) {
    return webSocketMessageQueue;
  }
  const nextQueue = [...webSocketMessageQueue];
  const [item] = nextQueue.splice(index, 1);
  if (item == null) {
    return webSocketMessageQueue;
  }
  nextQueue.splice(nextIndex, 0, item);
  return nextQueue;
}
