import type { YakuProtocol } from "../../lib/yaku-client";
import type { RequestConfigDraft } from "./requestConfigTypes";
import {
  pairsToHeaders,
  pairsToQueryParams,
  parseOptionalInteger,
  splitLines,
  stringOrNull,
} from "./requestConfigSharedHelpers";
import { grpcProtoDraft } from "./requestConfigGrpcHelpers";
import { buildHttpAuth } from "./requestConfigHttpAuthHelpers";
import {
  graphqlBodyText,
  graphqlVariablesObject,
} from "./requestConfigHttpGraphqlStateHelpers";
import { normalizedHttpBodyMode } from "./requestConfigHttpBodyHelpers";
import { multipartPartsToConfig } from "./requestConfigHttpMultipartHelpers";
import { normalizedWebSocketMessageQueue } from "./requestConfigWebSocketHelpers";

export function buildRequestConfigDraft(
  input: RequestConfigDraft & {
    protocol: YakuProtocol;
  },
): Record<string, unknown> {
  const timeout = parseOptionalInteger(input.timeoutMs);
  const trimmedUrl = input.url.trim();
  if (input.protocol === "grpc") {
    return {
      url: trimmedUrl,
      service: input.grpcService.trim(),
      method: input.grpcMethod.trim(),
      metadata: pairsToHeaders(input.grpcMetadata),
      message: input.grpcMessage.trim() === "" ? null : input.grpcMessage,
      protoImportRoots: splitLines(input.grpcProtoImportRoots),
      protoFiles: splitLines(input.grpcProtoFiles),
      useReflection: input.grpcUseReflection,
      timeoutMs: timeout ?? 30_000,
    };
  }

  if (input.protocol === "web_socket") {
    const messageQueue = normalizedWebSocketMessageQueue(
      input.webSocketMessageQueue,
    );
    return {
      url: trimmedUrl,
      headers: pairsToHeaders(input.headers),
      query: pairsToQueryParams(input.query),
      messages: messageQueue
        .filter((message) => message.enabled !== false)
        .map((message) => message.value.trim())
        .filter((message) => message !== ""),
      messageQueue: messageQueue
        .map((message) => ({
          kind: message.kind,
          value: message.value.trim(),
          enabled: message.enabled !== false,
        }))
        .filter((message) => message.value !== ""),
      maxMessages: parseOptionalInteger(input.webSocketMaxMessages) ?? 1,
      timeoutMs: timeout ?? 30_000,
    };
  }

  if (input.protocol === "sse") {
    return {
      url: trimmedUrl,
      headers: pairsToHeaders(input.headers),
      query: pairsToQueryParams(input.query),
      followRedirects: input.followRedirects,
      timeoutMs: timeout,
    };
  }

  if (input.protocol === "graphql") {
    const graphqlQuery = input.graphqlQuery.trim();
    if (graphqlQuery === "") {
      throw new Error("GraphQL query cannot be empty");
    }
    return {
      method: "POST",
      url: trimmedUrl,
      headers: pairsToHeaders(input.headers),
      query: pairsToQueryParams(input.query),
      bodyMode: "json",
      body: graphqlBodyText(input),
      graphqlQuery,
      graphqlVariables: graphqlVariablesObject(input),
      graphqlOperationName: stringOrNull(input.graphqlOperationName),
      cookieJarId: input.httpCookieJarId.trim() || null,
      auth: buildHttpAuth(input),
      followRedirects: input.followRedirects,
      timeoutMs: timeout,
    };
  }

  const bodyMode = normalizedHttpBodyMode(input);
  return {
    method: input.httpMethod.trim() || "GET",
    url: trimmedUrl,
    headers: pairsToHeaders(input.headers),
    query: pairsToQueryParams(input.query),
    bodyMode,
    body:
      bodyMode === "file" || bodyMode === "multipart"
        ? null
        : input.httpBody.trim() === ""
          ? null
          : input.httpBody,
    bodyFilePath:
      bodyMode === "file" ? input.httpBodyFilePath.trim() || null : null,
    multipartParts:
      bodyMode === "multipart"
        ? multipartPartsToConfig(input.httpMultipartParts)
        : [],
    cookieJarId: input.httpCookieJarId.trim() || null,
    auth: buildHttpAuth(input),
    followRedirects: input.followRedirects,
    timeoutMs: timeout,
  };
}
