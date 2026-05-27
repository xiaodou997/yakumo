import type { YakuCookieJar, YakuProtocol } from "../../lib/yaku-client";
import { HttpGraphqlFields } from "./RequestHttpGraphqlFields";
import { SseFields, WebSocketFields } from "./RequestRealtimeFields";
import { GrpcFields } from "./RequestGrpcFields";
import type { RequestConfigDraftController } from "./requestConfig";

export function RequestEditorProtocolFields({
  protocol,
  draft,
  cookieJars,
}: {
  protocol: YakuProtocol;
  draft: RequestConfigDraftController;
  cookieJars: YakuCookieJar[];
}) {
  if (protocol === "http" || protocol === "graphql") {
    return (
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
        httpCookieJarId={draft.httpCookieJarId}
        setHttpCookieJarId={draft.setHttpCookieJarId}
        cookieJars={cookieJars}
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
        graphqlQuery={draft.graphqlQuery}
        setGraphqlQuery={draft.setGraphqlQuery}
        graphqlVariables={draft.graphqlVariables}
        setGraphqlVariables={draft.setGraphqlVariables}
        graphqlOperationName={draft.graphqlOperationName}
        setGraphqlOperationName={draft.setGraphqlOperationName}
        headers={draft.headers}
        setHeaders={draft.setHeaders}
        query={draft.query}
        setQuery={draft.setQuery}
        followRedirects={draft.followRedirects}
        setFollowRedirects={draft.setFollowRedirects}
        timeoutMs={draft.timeoutMs}
        setTimeoutMs={draft.setTimeoutMs}
      />
    );
  }

  if (protocol === "sse") {
    return (
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
    );
  }

  if (protocol === "web_socket") {
    return (
      <WebSocketFields
        headers={draft.headers}
        setHeaders={draft.setHeaders}
        query={draft.query}
        setQuery={draft.setQuery}
        webSocketMessageQueue={draft.webSocketMessageQueue}
        setWebSocketMessageQueue={draft.setWebSocketMessageQueue}
        webSocketMaxMessages={draft.webSocketMaxMessages}
        setWebSocketMaxMessages={draft.setWebSocketMaxMessages}
        timeoutMs={draft.timeoutMs}
        setTimeoutMs={draft.setTimeoutMs}
      />
    );
  }

  if (protocol === "grpc") {
    return (
      <GrpcFields
        url={draft.url}
        grpcService={draft.grpcService}
        setGrpcService={draft.setGrpcService}
        grpcMethod={draft.grpcMethod}
        setGrpcMethod={draft.setGrpcMethod}
        grpcMessage={draft.grpcMessage}
        setGrpcMessage={draft.setGrpcMessage}
        grpcMetadata={draft.grpcMetadata}
        setGrpcMetadata={draft.setGrpcMetadata}
        grpcProtoImportRoots={draft.grpcProtoImportRoots}
        setGrpcProtoImportRoots={draft.setGrpcProtoImportRoots}
        grpcProtoFiles={draft.grpcProtoFiles}
        setGrpcProtoFiles={draft.setGrpcProtoFiles}
        grpcUseReflection={draft.grpcUseReflection}
        setGrpcUseReflection={draft.setGrpcUseReflection}
        timeoutMs={draft.timeoutMs}
        setTimeoutMs={draft.setTimeoutMs}
      />
    );
  }

  return null;
}
