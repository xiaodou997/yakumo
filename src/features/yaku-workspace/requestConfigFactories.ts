import type { ConfigPair } from "./types";
import type { MultipartPart, WebSocketMessageDraft } from "./requestConfigTypes";

export function createConfigPair(pair: Partial<ConfigPair> = {}) {
  return {
    id: pair.id ?? `pair_${Math.random().toString(16).slice(2)}`,
    name: pair.name ?? "",
    value: pair.value ?? "",
    enabled: pair.enabled ?? true,
  };
}

export function updateConfigPair(
  pairs: ConfigPair[],
  setPairs: (pairs: ConfigPair[]) => void,
  id: string,
  patch: Partial<ConfigPair>,
) {
  setPairs(
    pairs.map((pair) =>
      pair.id === id
        ? { ...pair, ...patch, enabled: patch.enabled ?? pair.enabled }
        : pair,
    ),
  );
}

export function createMultipartPart(
  part: Partial<MultipartPart> = {},
): MultipartPart {
  return {
    id: part.id ?? `mp_${Math.random().toString(16).slice(2)}`,
    name: part.name ?? "",
    kind: part.kind ?? "text",
    value: part.value ?? "",
    filePath: part.filePath ?? "",
    fileName: part.fileName ?? "",
    contentType: part.contentType ?? "",
    enabled: part.enabled ?? true,
  };
}

export function createWebSocketMessage(
  message: Partial<WebSocketMessageDraft> = {},
): WebSocketMessageDraft {
  return {
    id: message.id ?? `wsm_${Math.random().toString(16).slice(2)}`,
    kind: message.kind ?? "text",
    value: message.value ?? "",
    enabled: message.enabled ?? true,
  };
}

export function updateMultipartPart(
  parts: MultipartPart[],
  setParts: (parts: MultipartPart[]) => void,
  id: string,
  patch: Partial<MultipartPart>,
) {
  setParts(
    parts.map((part) => (part.id === id ? { ...part, ...patch } : part)),
  );
}
