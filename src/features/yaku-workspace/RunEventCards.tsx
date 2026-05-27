import type { ReactNode } from "react";
import { VStack } from "../../components/core/Stacks";
import type { YakuRunEvent } from "../../lib/yaku-client";
import {
  parseErrorMessageEvent,
  parseGrpcMessageEvent,
  parseGrpcRequestHeaderEvent,
  parseHttpCookieEvent,
  parseHttpRequestHeaderEvent,
  parseHttpResponseHeaderEvent,
  parseRequestBodyEvent,
  parseWebSocketMessageEvent,
} from "./RunEventParser";
import { GrpcMessageEventCard, GrpcRequestHeaderEventCard } from "./RunEventGrpcCards";
import {
  HttpCookieEventCard,
  HttpRequestHeaderEventCard,
  HttpResponseHeaderEventCard,
} from "./RunEventHttpCards";
import { ErrorEventCard, WebSocketMessageEventCard } from "./RunEventMessageCards";
import { RequestBodyEventCard } from "./RunEventRequestBodyCard";

export function renderRunEventDetails(
  event: YakuRunEvent,
  websocketMessage = parseWebSocketMessageEvent(event),
  grpcRequestHeaderEvent = parseGrpcRequestHeaderEvent(event),
  requestBodyEvent = parseRequestBodyEvent(event),
  grpcMessageEvent = parseGrpcMessageEvent(event),
  errorEvent = parseErrorMessageEvent(event),
): ReactNode {
  const httpRequestHeaders = parseHttpRequestHeaderEvent(event);
  const httpResponseHeaders = parseHttpResponseHeaderEvent(event);
  const httpCookies = parseHttpCookieEvent(event);
  if (websocketMessage != null) {
    return <WebSocketMessageEventCard event={websocketMessage} />;
  }
  if (grpcRequestHeaderEvent != null) {
    return (
      <VStack space={2}>
        <GrpcRequestHeaderEventCard event={grpcRequestHeaderEvent} />
        <pre className="overflow-auto whitespace-pre-wrap text-xs text-text-subtle">
          {JSON.stringify(event.data, null, 2)}
        </pre>
      </VStack>
    );
  }
  if (httpRequestHeaders != null) {
    return (
      <VStack space={2}>
        <HttpRequestHeaderEventCard event={httpRequestHeaders} />
        {httpCookies?.kind === "request_headers" ? (
          <HttpCookieEventCard event={httpCookies} />
        ) : null}
        <pre className="overflow-auto whitespace-pre-wrap text-xs text-text-subtle">
          {JSON.stringify(event.data, null, 2)}
        </pre>
      </VStack>
    );
  }
  if (httpResponseHeaders != null) {
    return (
      <VStack space={2}>
        <HttpResponseHeaderEventCard event={httpResponseHeaders} />
        {httpCookies?.kind === "response_headers" ? (
          <HttpCookieEventCard event={httpCookies} />
        ) : null}
        <pre className="overflow-auto whitespace-pre-wrap text-xs text-text-subtle">
          {JSON.stringify(event.data, null, 2)}
        </pre>
      </VStack>
    );
  }
  if (requestBodyEvent != null) {
    return (
      <VStack space={2}>
        <RequestBodyEventCard event={requestBodyEvent} />
        <pre className="overflow-auto whitespace-pre-wrap text-xs text-text-subtle">
          {JSON.stringify(event.data, null, 2)}
        </pre>
      </VStack>
    );
  }
  if (grpcMessageEvent != null) {
    return (
      <VStack space={2}>
        <GrpcMessageEventCard event={grpcMessageEvent} />
        <pre className="overflow-auto whitespace-pre-wrap text-xs text-text-subtle">
          {JSON.stringify(event.data, null, 2)}
        </pre>
      </VStack>
    );
  }
  if (errorEvent != null) {
    return (
      <VStack space={2}>
        <ErrorEventCard message={errorEvent.message} />
        <pre className="overflow-auto whitespace-pre-wrap text-xs text-text-subtle">
          {JSON.stringify(event.data, null, 2)}
        </pre>
      </VStack>
    );
  }
  if (event.kind === "complete") {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-3 py-3 text-xs text-text-subtle">
        Run completed and all expected events were recorded.
      </div>
    );
  }

  return (
    <pre className="overflow-auto whitespace-pre-wrap text-xs text-text-subtle">
      {JSON.stringify(event.data, null, 2)}
    </pre>
  );
}
