import { VStack } from "../../components/core/Stacks";
import type { YakuProtocol } from "../../lib/yaku-client";
import { fieldClassName } from "./RequestFieldPrimitives";
import { GrpcFields, HttpGraphqlFields, SseFields, WebSocketFields } from "./RequestProtocolFields";
import { summarizeRequestConfig } from "./requestConfig";
import type { ConfigPair } from "./types";

export function RequestStructuredEditor({
  protocol,
  url,
  setUrl,
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
  webSocketMessages,
  setWebSocketMessages,
  webSocketMaxMessages,
  setWebSocketMaxMessages,
}: {
  protocol: YakuProtocol;
  url: string;
  setUrl: (value: string) => void;
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
  webSocketMessages: string;
  setWebSocketMessages: (value: string) => void;
  webSocketMaxMessages: string;
  setWebSocketMaxMessages: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-text-subtlest">
        Structured Config
      </div>
      <VStack space={2}>
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={protocol === "web_socket" ? "ws://example.com/socket" : "https://example.com"}
          className={fieldClassName}
        />
        {protocol === "http" || protocol === "graphql" ? (
          <HttpGraphqlFields
            protocol={protocol}
            httpMethod={httpMethod}
            setHttpMethod={setHttpMethod}
            httpBody={httpBody}
            setHttpBody={setHttpBody}
            headers={headers}
            setHeaders={setHeaders}
            query={query}
            setQuery={setQuery}
            followRedirects={followRedirects}
            setFollowRedirects={setFollowRedirects}
            timeoutMs={timeoutMs}
            setTimeoutMs={setTimeoutMs}
          />
        ) : null}
        {protocol === "sse" ? (
          <SseFields
            headers={headers}
            setHeaders={setHeaders}
            query={query}
            setQuery={setQuery}
            followRedirects={followRedirects}
            setFollowRedirects={setFollowRedirects}
            timeoutMs={timeoutMs}
            setTimeoutMs={setTimeoutMs}
          />
        ) : null}
        {protocol === "web_socket" ? (
          <WebSocketFields
            headers={headers}
            setHeaders={setHeaders}
            query={query}
            setQuery={setQuery}
            webSocketMessages={webSocketMessages}
            setWebSocketMessages={setWebSocketMessages}
            webSocketMaxMessages={webSocketMaxMessages}
            setWebSocketMaxMessages={setWebSocketMaxMessages}
            timeoutMs={timeoutMs}
            setTimeoutMs={setTimeoutMs}
          />
        ) : null}
        {protocol === "grpc" ? (
          <GrpcFields
            grpcService={grpcService}
            setGrpcService={setGrpcService}
            grpcMethod={grpcMethod}
            setGrpcMethod={setGrpcMethod}
            grpcMessage={grpcMessage}
            setGrpcMessage={setGrpcMessage}
            grpcMetadata={grpcMetadata}
            setGrpcMetadata={setGrpcMetadata}
            grpcUseReflection={grpcUseReflection}
            setGrpcUseReflection={setGrpcUseReflection}
            timeoutMs={timeoutMs}
            setTimeoutMs={setTimeoutMs}
          />
        ) : null}
      </VStack>
    </div>
  );
}

export function RequestConfigSummary({
  protocol,
  config,
}: {
  protocol: YakuProtocol;
  config: Record<string, unknown>;
}) {
  const entries = summarizeRequestConfig(protocol, config);
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-text-subtlest">
        Protocol Summary
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.label} className="rounded-lg border border-border-subtle bg-surface-highlight/40 px-2 py-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">
              {entry.label}
            </div>
            <div className="mt-1 break-words text-xs text-text">{entry.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
