import type { WebSocketMessageDraft } from "./requestConfig";

export function webSocketMessagePlaceholder(
  kind: WebSocketMessageDraft["kind"],
) {
  if (kind === "ping") {
    return "Ping payload";
  }
  if (kind === "binary") {
    return "Hex payload, for example 00ff10";
  }
  return "Text frame payload";
}

export function webSocketMessageDescription(
  kind: WebSocketMessageDraft["kind"],
) {
  if (kind === "ping") {
    return "Ping payload is sent as UTF-8 bytes.";
  }
  if (kind === "binary") {
    return "Binary payload is interpreted as hexadecimal bytes.";
  }
  return "Text payload is sent as a UTF-8 text frame.";
}

export function webSocketBinaryLengthSummary(value: string) {
  const normalized = value.replace(/\s+/g, "");
  if (normalized.length === 0) {
    return "No bytes";
  }
  if (!/^[0-9a-fA-F]+$/.test(normalized)) {
    return "Invalid hex";
  }
  if (normalized.length % 2 !== 0) {
    return "Hex length must be even";
  }
  return `${normalized.length / 2} bytes`;
}
