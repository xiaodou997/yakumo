import type { YakuRunEvent } from "../../lib/yaku-client";
import {
  parseErrorMessageEvent,
  parseGrpcMessageEvent,
  parseGrpcRequestHeaderEvent,
  parseHttpRequestHeaderEvent,
  parseHttpResponseHeaderEvent,
  parseRequestBodyEvent,
  parseWebSocketMessageEvent,
} from "./RunEventParser";
import {
  summarizeWebSocketPayload,
  truncateLine,
} from "./RunEventFormatters";
import type {
  RunFailureSummary,
  RunPayloadSummary,
  RunProtocolSummary,
} from "./RunPanelsComparisonModel";

export function buildRunProtocolSummary(events: YakuRunEvent[]): RunProtocolSummary {
  let httpStatusCode: number | null = null;
  let httpResponseCount = 0;
  let grpcMessageCount = 0;
  let websocketMessageCount = 0;
  let websocketSentCount = 0;
  let websocketReceivedCount = 0;
  let errorCount = 0;

  for (const event of events) {
    const httpResponseHeaders = parseHttpResponseHeaderEvent(event);
    const grpcMessageEvent = parseGrpcMessageEvent(event);
    const websocketMessage = parseWebSocketMessageEvent(event);

    if (httpResponseHeaders != null) {
      httpStatusCode = httpResponseHeaders.statusCode;
      httpResponseCount += 1;
    }
    if (grpcMessageEvent != null) {
      grpcMessageCount += 1;
    }
    if (websocketMessage != null) {
      websocketMessageCount += 1;
      if (websocketMessage.direction === "sent") {
        websocketSentCount += 1;
      } else if (websocketMessage.direction === "received") {
        websocketReceivedCount += 1;
      }
    }
    if (parseErrorMessageEvent(event) != null) {
      errorCount += 1;
    }
  }

  return {
    httpStatusCode,
    httpResponseCount,
    grpcMessageCount,
    websocketMessageCount,
    websocketSentCount,
    websocketReceivedCount,
    errorCount,
  };
}

export function buildRunPayloadSummary(events: YakuRunEvent[]): RunPayloadSummary {
  let httpMethod: string | null = null;
  let httpRequestHeadersEventId: number | null = null;
  let httpUrl: string | null = null;
  let httpAuth: string | null = null;
  let httpBodyMode: string | null = null;
  let requestBodyEventId: number | null = null;
  let graphqlOperationName: string | null = null;
  let grpcRequestHeaderEventId: number | null = null;
  let grpcServiceMethod: string | null = null;
  let websocketFirstSentEventId: number | null = null;
  let websocketFirstSent: string | null = null;

  for (const event of events) {
    const httpRequestHeaders = parseHttpRequestHeaderEvent(event);
    const grpcRequestHeaderEvent = parseGrpcRequestHeaderEvent(event);
    const requestBodyEvent = parseRequestBodyEvent(event);
    const websocketMessage = parseWebSocketMessageEvent(event);

    if (httpRequestHeaders != null) {
      httpMethod = httpRequestHeaders.method;
      httpRequestHeadersEventId = event.id;
      httpUrl = httpRequestHeaders.url;
      httpAuth = httpRequestHeaders.auth;
      httpBodyMode = httpRequestHeaders.bodyMode;
    }
    if (grpcRequestHeaderEvent != null) {
      grpcRequestHeaderEventId = event.id;
      grpcServiceMethod = `${grpcRequestHeaderEvent.service}.${grpcRequestHeaderEvent.method}`;
    }
    if (requestBodyEvent != null) {
      requestBodyEventId = event.id;
      if (requestBodyEvent.kind === "graphql") {
        graphqlOperationName = requestBodyEvent.graphql?.operationName ?? "query";
      }
    }
    if (
      websocketFirstSent == null &&
      websocketMessage != null &&
      websocketMessage.direction === "sent"
    ) {
      websocketFirstSentEventId = event.id;
      const payloadPreview = summarizeWebSocketPayload(websocketMessage);
      websocketFirstSent =
        payloadPreview == null
          ? websocketMessage.kind
          : `${websocketMessage.kind} · ${payloadPreview}`;
    }
  }

  return {
    httpMethod,
    httpRequestHeadersEventId,
    httpUrl,
    httpAuth,
    httpBodyMode,
    requestBodyEventId,
    graphqlOperationName,
    grpcRequestHeaderEventId,
    grpcServiceMethod,
    websocketFirstSentEventId,
    websocketFirstSent,
  };
}

export function buildRunFailureSummary(events: YakuRunEvent[]): RunFailureSummary {
  let lastHttpResponse: string | null = null;
  let lastHttpResponseEventId: number | null = null;
  let lastError: string | null = null;
  let lastErrorEventId: number | null = null;
  let lastGrpcMessage: string | null = null;
  let lastGrpcMessageEventId: number | null = null;
  let lastWebSocketMessage: string | null = null;
  let lastWebSocketMessageEventId: number | null = null;

  for (const event of events) {
    const httpResponseHeaders = parseHttpResponseHeaderEvent(event);
    const errorEvent = parseErrorMessageEvent(event);
    const grpcMessageEvent = parseGrpcMessageEvent(event);
    const websocketMessage = parseWebSocketMessageEvent(event);

    if (httpResponseHeaders != null) {
      lastHttpResponse = `status ${httpResponseHeaders.statusCode} · ${httpResponseHeaders.headerCount} headers`;
      lastHttpResponseEventId = event.id;
    }
    if (errorEvent != null) {
      lastError = errorEvent.message;
      lastErrorEventId = event.id;
    }
    if (grpcMessageEvent != null) {
      lastGrpcMessage =
        grpcMessageEvent.type === "reflection_services"
          ? `${grpcMessageEvent.services.length} reflection service${grpcMessageEvent.services.length === 1 ? "" : "s"}`
          : truncateLine(JSON.stringify(grpcMessageEvent.json), 56);
      lastGrpcMessageEventId = event.id;
    }
    if (websocketMessage != null) {
      const preview = summarizeWebSocketPayload(websocketMessage);
      lastWebSocketMessage =
        preview == null
          ? `${websocketMessage.direction} ${websocketMessage.kind}`
          : `${websocketMessage.direction} ${websocketMessage.kind} · ${preview}`;
      lastWebSocketMessageEventId = event.id;
    }
  }

  return {
    lastHttpResponse,
    lastHttpResponseEventId,
    lastError,
    lastErrorEventId,
    lastGrpcMessage,
    lastGrpcMessageEventId,
    lastWebSocketMessage,
    lastWebSocketMessageEventId,
  };
}
