import type { YakuRunEvent } from "../../lib/yaku-client";
import {
  parseErrorMessageEvent,
  parseGrpcMessageEvent,
  parseGrpcRequestHeaderEvent,
  parseRequestBodyEvent,
  parseWebSocketMessageEvent,
} from "./RunEventParser";

export function summarizeWebSocketPayload(event: {
  kind: string;
  text: string | null;
  hex: string | null;
}) {
  if (event.kind === "close") {
    return null;
  }
  if (event.kind === "binary") {
    return event.hex == null || event.hex === "" ? null : truncateMiddle(event.hex, 24);
  }
  if (event.text == null || event.text.trim() === "") {
    return null;
  }
  return truncateLine(event.text, 32);
}

export function formatRunEventTitle(
  event: YakuRunEvent,
  websocketMessage = parseWebSocketMessageEvent(event),
  grpcRequestHeaderEvent = parseGrpcRequestHeaderEvent(event),
  requestBodyEvent = parseRequestBodyEvent(event),
  grpcMessageEvent = parseGrpcMessageEvent(event),
  errorEvent = parseErrorMessageEvent(event),
) {
  if (websocketMessage == null) {
    if (grpcRequestHeaderEvent != null) {
      return `gRPC request · ${grpcRequestHeaderEvent.service}.${grpcRequestHeaderEvent.method}`;
    }
    if (requestBodyEvent != null) {
      return formatRequestBodyEventTitle(requestBodyEvent);
    }
    if (grpcMessageEvent != null) {
      return formatGrpcMessageEventTitle(grpcMessageEvent);
    }
    if (errorEvent != null) {
      return `Error · ${truncateLine(errorEvent.message, 48)}`;
    }
    return event.kind === "complete" ? "Complete" : event.kind;
  }

  const parts = [
    capitalizeWord(websocketMessage.direction),
    websocketMessage.kind,
    websocketMessage.messageIndex == null ? "frame" : `frame #${websocketMessage.messageIndex}`,
  ];
  const preview = summarizeWebSocketPayload(websocketMessage);
  return preview == null ? parts.join(" ") : `${parts.join(" ")} · ${preview}`;
}

export function buildRunEventSearchText(event: YakuRunEvent) {
  const websocketMessage = parseWebSocketMessageEvent(event);
  const grpcRequestHeaderEvent = parseGrpcRequestHeaderEvent(event);
  const requestBodyEvent = parseRequestBodyEvent(event);
  const grpcMessageEvent = parseGrpcMessageEvent(event);
  const errorEvent = parseErrorMessageEvent(event);
  return [
    formatRunEventTitle(
      event,
      websocketMessage,
      grpcRequestHeaderEvent,
      requestBodyEvent,
      grpcMessageEvent,
      errorEvent,
    ),
    JSON.stringify(event.data),
  ]
    .join(" ")
    .toLowerCase();
}

export function truncateLine(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3)}...`;
}

export function formatEventDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatRequestBodyEventTitle(event: ReturnType<typeof parseRequestBodyEvent>) {
  if (event == null) {
    return "request_body";
  }
  if (event.kind === "file") {
    return `File request body · ${event.byteLength == null ? "unknown bytes" : `${event.byteLength} bytes`}`;
  }
  if (event.kind === "multipart") {
    return `Multipart request body · ${event.partCount} part${event.partCount === 1 ? "" : "s"}`;
  }
  if (event.kind === "grpc") {
    return `gRPC request body · ${truncateLine(event.text, 40)}`;
  }
  if (event.kind === "graphql") {
    return `GraphQL request body · ${event.graphql?.operationName ?? "query"}`;
  }
  return `${capitalizeWord(event.kind)} request body`;
}

function formatGrpcMessageEventTitle(event: ReturnType<typeof parseGrpcMessageEvent>) {
  if (event == null) {
    return "message";
  }
  if (event.type === "reflection_services") {
    return `gRPC reflection services · ${event.services.length} service${event.services.length === 1 ? "" : "s"}`;
  }
  return "gRPC message";
}

function capitalizeWord(value: string) {
  return value.length === 0 ? value : `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function truncateMiddle(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  const sideLength = Math.max(4, Math.floor((maxLength - 3) / 2));
  return `${value.slice(0, sideLength)}...${value.slice(-sideLength)}`;
}
