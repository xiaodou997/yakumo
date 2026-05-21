import type { ConfigPair } from "./types";
import { CheckboxField, PairListEditor, fieldClassName, textareaClassName } from "./RequestFieldPrimitives";

export function HttpGraphqlFields({
  protocol,
  httpMethod,
  setHttpMethod,
  httpBody,
  setHttpBody,
  headers,
  setHeaders,
  query,
  setQuery,
  followRedirects,
  setFollowRedirects,
  timeoutMs,
  setTimeoutMs,
}: {
  protocol: "http" | "graphql";
  httpMethod: string;
  setHttpMethod: (value: string) => void;
  httpBody: string;
  setHttpBody: (value: string) => void;
  headers: ConfigPair[];
  setHeaders: (pairs: ConfigPair[]) => void;
  query: ConfigPair[];
  setQuery: (pairs: ConfigPair[]) => void;
  followRedirects: boolean;
  setFollowRedirects: (value: boolean) => void;
  timeoutMs: string;
  setTimeoutMs: (value: string) => void;
}) {
  return (
    <>
      {protocol === "http" ? (
        <input
          value={httpMethod}
          onChange={(event) => setHttpMethod(event.target.value)}
          placeholder="GET"
          className={fieldClassName}
        />
      ) : null}
      <textarea
        value={httpBody}
        onChange={(event) => setHttpBody(event.target.value)}
        rows={5}
        placeholder={protocol === "graphql" ? '{"query":"{ __typename }"}' : "Request body"}
        className={textareaClassName}
      />
      <PairListEditor
        title="Headers"
        pairs={headers}
        setPairs={setHeaders}
        namePlaceholder="Header"
        valuePlaceholder="Value"
      />
      <PairListEditor
        title="Query"
        pairs={query}
        setPairs={setQuery}
        includeEnabled
        namePlaceholder="Parameter"
        valuePlaceholder="Value"
      />
      <CheckboxField checked={followRedirects} onChange={setFollowRedirects}>
        Follow redirects
      </CheckboxField>
      <input
        value={timeoutMs}
        onChange={(event) => setTimeoutMs(event.target.value)}
        placeholder="Timeout ms"
        className={fieldClassName}
      />
    </>
  );
}

export function SseFields({
  headers,
  setHeaders,
  query,
  setQuery,
  followRedirects,
  setFollowRedirects,
  timeoutMs,
  setTimeoutMs,
}: {
  headers: ConfigPair[];
  setHeaders: (pairs: ConfigPair[]) => void;
  query: ConfigPair[];
  setQuery: (pairs: ConfigPair[]) => void;
  followRedirects: boolean;
  setFollowRedirects: (value: boolean) => void;
  timeoutMs: string;
  setTimeoutMs: (value: string) => void;
}) {
  return (
    <>
      <PairListEditor
        title="Headers"
        pairs={headers}
        setPairs={setHeaders}
        namePlaceholder="Header"
        valuePlaceholder="Value"
      />
      <PairListEditor
        title="Query"
        pairs={query}
        setPairs={setQuery}
        includeEnabled
        namePlaceholder="Parameter"
        valuePlaceholder="Value"
      />
      <CheckboxField checked={followRedirects} onChange={setFollowRedirects}>
        Follow redirects
      </CheckboxField>
      <input
        value={timeoutMs}
        onChange={(event) => setTimeoutMs(event.target.value)}
        placeholder="Timeout ms"
        className={fieldClassName}
      />
    </>
  );
}

export function WebSocketFields({
  headers,
  setHeaders,
  query,
  setQuery,
  webSocketMessages,
  setWebSocketMessages,
  webSocketMaxMessages,
  setWebSocketMaxMessages,
  timeoutMs,
  setTimeoutMs,
}: {
  headers: ConfigPair[];
  setHeaders: (pairs: ConfigPair[]) => void;
  query: ConfigPair[];
  setQuery: (pairs: ConfigPair[]) => void;
  webSocketMessages: string;
  setWebSocketMessages: (value: string) => void;
  webSocketMaxMessages: string;
  setWebSocketMaxMessages: (value: string) => void;
  timeoutMs: string;
  setTimeoutMs: (value: string) => void;
}) {
  return (
    <>
      <PairListEditor
        title="Headers"
        pairs={headers}
        setPairs={setHeaders}
        namePlaceholder="Header"
        valuePlaceholder="Value"
      />
      <PairListEditor
        title="Query"
        pairs={query}
        setPairs={setQuery}
        includeEnabled
        namePlaceholder="Parameter"
        valuePlaceholder="Value"
      />
      <textarea
        value={webSocketMessages}
        onChange={(event) => setWebSocketMessages(event.target.value)}
        rows={5}
        placeholder="One message per line"
        className={textareaClassName}
      />
      <input
        value={webSocketMaxMessages}
        onChange={(event) => setWebSocketMaxMessages(event.target.value)}
        placeholder="Max messages"
        className={fieldClassName}
      />
      <input
        value={timeoutMs}
        onChange={(event) => setTimeoutMs(event.target.value)}
        placeholder="Timeout ms"
        className={fieldClassName}
      />
    </>
  );
}

export function GrpcFields({
  grpcService,
  setGrpcService,
  grpcMethod,
  setGrpcMethod,
  grpcMessage,
  setGrpcMessage,
  grpcMetadata,
  setGrpcMetadata,
  grpcUseReflection,
  setGrpcUseReflection,
  timeoutMs,
  setTimeoutMs,
}: {
  grpcService: string;
  setGrpcService: (value: string) => void;
  grpcMethod: string;
  setGrpcMethod: (value: string) => void;
  grpcMessage: string;
  setGrpcMessage: (value: string) => void;
  grpcMetadata: ConfigPair[];
  setGrpcMetadata: (pairs: ConfigPair[]) => void;
  grpcUseReflection: boolean;
  setGrpcUseReflection: (value: boolean) => void;
  timeoutMs: string;
  setTimeoutMs: (value: string) => void;
}) {
  return (
    <>
      <input
        value={grpcService}
        onChange={(event) => setGrpcService(event.target.value)}
        placeholder="package.Service"
        className={fieldClassName}
      />
      <input
        value={grpcMethod}
        onChange={(event) => setGrpcMethod(event.target.value)}
        placeholder="Method"
        className={fieldClassName}
      />
      <textarea
        value={grpcMessage}
        onChange={(event) => setGrpcMessage(event.target.value)}
        rows={5}
        placeholder='{"ping":"pong"}'
        className={textareaClassName}
      />
      <PairListEditor
        title="Metadata"
        pairs={grpcMetadata}
        setPairs={setGrpcMetadata}
        namePlaceholder="Metadata"
        valuePlaceholder="Value"
      />
      <CheckboxField checked={grpcUseReflection} onChange={setGrpcUseReflection}>
        Use reflection
      </CheckboxField>
      <input
        value={timeoutMs}
        onChange={(event) => setTimeoutMs(event.target.value)}
        placeholder="Timeout ms"
        className={fieldClassName}
      />
    </>
  );
}
