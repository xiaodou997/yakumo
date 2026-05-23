import { VStack } from "../../components/core/Stacks";
import type { YakuProtocol } from "../../lib/yaku-client";
import { fieldClassName } from "./RequestFieldPrimitives";
import { GrpcFields, HttpGraphqlFields, SseFields, WebSocketFields } from "./RequestProtocolFields";
import { summarizeRequestConfig, type RequestConfigDraftController } from "./requestConfig";

export function RequestStructuredEditor({
  protocol,
  draft,
}: {
  protocol: YakuProtocol;
  draft: RequestConfigDraftController;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-text-subtlest">
        Structured Config
      </div>
      <VStack space={2}>
        <input
          value={draft.url}
          onChange={(event) => draft.setUrl(event.target.value)}
          placeholder={protocol === "web_socket" ? "ws://example.com/socket" : "https://example.com"}
          className={fieldClassName}
        />
        {protocol === "http" || protocol === "graphql" ? (
          <HttpGraphqlFields
            protocol={protocol}
            httpMethod={draft.httpMethod}
            setHttpMethod={draft.setHttpMethod}
            httpBody={draft.httpBody}
            setHttpBody={draft.setHttpBody}
            httpBodyMode={draft.httpBodyMode}
            setHttpBodyMode={draft.setHttpBodyMode}
            httpBodyFilePath={draft.httpBodyFilePath}
            setHttpBodyFilePath={draft.setHttpBodyFilePath}
            httpMultipartParts={draft.httpMultipartParts}
            setHttpMultipartParts={draft.setHttpMultipartParts}
            httpAuthType={draft.httpAuthType}
            setHttpAuthType={draft.setHttpAuthType}
            httpAuthUsername={draft.httpAuthUsername}
            setHttpAuthUsername={draft.setHttpAuthUsername}
            httpAuthPassword={draft.httpAuthPassword}
            setHttpAuthPassword={draft.setHttpAuthPassword}
            httpAuthToken={draft.httpAuthToken}
            setHttpAuthToken={draft.setHttpAuthToken}
            httpAuthPasswordSecretId={draft.httpAuthPasswordSecretId}
            httpAuthTokenSecretId={draft.httpAuthTokenSecretId}
            headers={draft.headers}
            setHeaders={draft.setHeaders}
            query={draft.query}
            setQuery={draft.setQuery}
            followRedirects={draft.followRedirects}
            setFollowRedirects={draft.setFollowRedirects}
            timeoutMs={draft.timeoutMs}
            setTimeoutMs={draft.setTimeoutMs}
          />
        ) : null}
        {protocol === "sse" ? (
          <SseFields
            headers={draft.headers}
            setHeaders={draft.setHeaders}
            query={draft.query}
            setQuery={draft.setQuery}
            followRedirects={draft.followRedirects}
            setFollowRedirects={draft.setFollowRedirects}
            timeoutMs={draft.timeoutMs}
            setTimeoutMs={draft.setTimeoutMs}
          />
        ) : null}
        {protocol === "web_socket" ? (
          <WebSocketFields
            headers={draft.headers}
            setHeaders={draft.setHeaders}
            query={draft.query}
            setQuery={draft.setQuery}
            webSocketMessages={draft.webSocketMessages}
            setWebSocketMessages={draft.setWebSocketMessages}
            webSocketMaxMessages={draft.webSocketMaxMessages}
            setWebSocketMaxMessages={draft.setWebSocketMaxMessages}
            timeoutMs={draft.timeoutMs}
            setTimeoutMs={draft.setTimeoutMs}
          />
        ) : null}
        {protocol === "grpc" ? (
          <GrpcFields
            grpcService={draft.grpcService}
            setGrpcService={draft.setGrpcService}
            grpcMethod={draft.grpcMethod}
            setGrpcMethod={draft.setGrpcMethod}
            grpcMessage={draft.grpcMessage}
            setGrpcMessage={draft.setGrpcMessage}
            grpcMetadata={draft.grpcMetadata}
            setGrpcMetadata={draft.setGrpcMetadata}
            grpcProtoFiles={draft.grpcProtoFiles}
            setGrpcProtoFiles={draft.setGrpcProtoFiles}
            grpcUseReflection={draft.grpcUseReflection}
            setGrpcUseReflection={draft.setGrpcUseReflection}
            timeoutMs={draft.timeoutMs}
            setTimeoutMs={draft.setTimeoutMs}
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
