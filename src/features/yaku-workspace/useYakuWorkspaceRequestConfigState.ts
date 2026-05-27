import { useEffect, useMemo, useState } from "react";
import type { YakuProtocol, YakuRequest } from "../../lib/yaku-client";
import {
  createMultipartPart,
  createWebSocketMessage,
  draftFromRequestConfig,
  type MultipartPart,
  type RequestConfigDraft,
  type RequestConfigDraftController,
  type WebSocketMessageDraft,
} from "./requestConfig";
import type { ConfigPair } from "./types";

export function createDefaultRequestConfigDraft(protocol: YakuProtocol): RequestConfigDraft {
  return {
    url: "https://example.com",
    httpMethod: protocol === "graphql" ? "POST" : "GET",
    httpBody: protocol === "graphql" ? '{"query":"{ __typename }"}' : "",
    httpBodyMode: protocol === "graphql" ? "json" : "text",
    httpBodyFilePath: "",
    httpMultipartParts: [],
    httpCookieJarId: "",
    httpAuthType: "none",
    httpAuthUsername: "",
    httpAuthPassword: "",
    httpAuthToken: "",
    httpAuthPasswordSecretId: "",
    httpAuthTokenSecretId: "",
    headers: [],
    query: [],
    followRedirects: true,
    timeoutMs: protocol === "web_socket" || protocol === "grpc" ? "30000" : "",
    graphqlQuery: "query { __typename }",
    graphqlVariables: "",
    graphqlOperationName: "",
    grpcService: "",
    grpcMethod: "",
    grpcMessage: "{}",
    grpcMetadata: [],
    grpcProtoImportRoots: "",
    grpcProtoFiles: "",
    grpcUseReflection: true,
    webSocketMessageQueue: [createWebSocketMessage({ value: "hello" })],
    webSocketMaxMessages: "1",
  };
}

export function useYakuWorkspaceRequestConfigController(initialDraft: RequestConfigDraft) {
  const [draft, setDraft] = useState<RequestConfigDraft>(initialDraft);

  const controller = useMemo<RequestConfigDraftController>(
    () => createRequestConfigDraftController(draft, setDraft),
    [draft],
  );

  return {
    draft,
    setDraft,
    controller,
  };
}

export function useYakuWorkspaceRequestBuilderConfig(protocol: YakuProtocol) {
  const initialDraft = useMemo(() => createDefaultRequestConfigDraft(protocol), [protocol]);
  const state = useYakuWorkspaceRequestConfigController(initialDraft);

  useEffect(() => {
    state.setDraft(createDefaultRequestConfigDraft(protocol));
  }, [protocol]);

  return state;
}

export function useYakuWorkspaceRequestEditConfig(loadedRequest: YakuRequest | null | undefined) {
  const initialDraft = useMemo<RequestConfigDraft>(
    () =>
      loadedRequest == null
        ? createDefaultRequestConfigDraft("http")
        : draftFromRequestConfig(loadedRequest.protocol, loadedRequest.config),
    [loadedRequest],
  );
  const state = useYakuWorkspaceRequestConfigController(initialDraft);

  useEffect(() => {
    if (loadedRequest == null) {
      state.setDraft(createDefaultRequestConfigDraft("http"));
      return;
    }
    state.setDraft(draftFromRequestConfig(loadedRequest.protocol, loadedRequest.config));
  }, [loadedRequest]);

  return state;
}

function createRequestConfigDraftController(
  draft: RequestConfigDraft,
  setDraft: (value: RequestConfigDraft) => void,
): RequestConfigDraftController {
  return {
    ...draft,
    setUrl: (value) => setDraft({ ...draft, url: value }),
    setHttpMethod: (value) => setDraft({ ...draft, httpMethod: value }),
    setHttpBody: (value) => setDraft({ ...draft, httpBody: value }),
    setHttpBodyMode: (value) => setDraft({ ...draft, httpBodyMode: value }),
    setHttpBodyFilePath: (value) => setDraft({ ...draft, httpBodyFilePath: value }),
    setHttpMultipartParts: (value) => setDraft({ ...draft, httpMultipartParts: value }),
    setHttpCookieJarId: (value) => setDraft({ ...draft, httpCookieJarId: value }),
    setHttpAuthType: (value) => setDraft({ ...draft, httpAuthType: value }),
    setHttpAuthUsername: (value) => setDraft({ ...draft, httpAuthUsername: value }),
    setHttpAuthPassword: (value) => setDraft({ ...draft, httpAuthPassword: value }),
    setHttpAuthToken: (value) => setDraft({ ...draft, httpAuthToken: value }),
    setHttpAuthPasswordSecretId: (value) =>
      setDraft({ ...draft, httpAuthPasswordSecretId: value }),
    setHttpAuthTokenSecretId: (value) => setDraft({ ...draft, httpAuthTokenSecretId: value }),
    setHeaders: (value) => setDraft({ ...draft, headers: value }),
    setQuery: (value) => setDraft({ ...draft, query: value }),
    setFollowRedirects: (value) => setDraft({ ...draft, followRedirects: value }),
    setTimeoutMs: (value) => setDraft({ ...draft, timeoutMs: value }),
    setGraphqlQuery: (value) => setDraft({ ...draft, graphqlQuery: value }),
    setGraphqlVariables: (value) => setDraft({ ...draft, graphqlVariables: value }),
    setGraphqlOperationName: (value) => setDraft({ ...draft, graphqlOperationName: value }),
    setGrpcService: (value) => setDraft({ ...draft, grpcService: value }),
    setGrpcMethod: (value) => setDraft({ ...draft, grpcMethod: value }),
    setGrpcMessage: (value) => setDraft({ ...draft, grpcMessage: value }),
    setGrpcMetadata: (value) => setDraft({ ...draft, grpcMetadata: value }),
    setGrpcProtoImportRoots: (value) => setDraft({ ...draft, grpcProtoImportRoots: value }),
    setGrpcProtoFiles: (value) => setDraft({ ...draft, grpcProtoFiles: value }),
    setGrpcUseReflection: (value) => setDraft({ ...draft, grpcUseReflection: value }),
    setWebSocketMessageQueue: (value) => setDraft({ ...draft, webSocketMessageQueue: value }),
    setWebSocketMaxMessages: (value) => setDraft({ ...draft, webSocketMaxMessages: value }),
  };
}

export function createMultipartPartDraft(part: Partial<MultipartPart> = {}) {
  return createMultipartPart(part);
}

export function createWebSocketMessageDraft(message: Partial<WebSocketMessageDraft> = {}) {
  return createWebSocketMessage(message);
}

export function buildRequestDraftFromConfig(
  protocol: YakuProtocol,
  config: Record<string, unknown>,
) {
  return draftFromRequestConfig(protocol, config);
}
