import type { YakuProtocol } from "../../lib/yaku-client";
import type { RequestConfigDraft } from "./requestConfigTypes";
import {
  pairsFromHeaders,
  pairsFromQuery,
  stringOrEmpty,
} from "./requestConfigSharedHelpers";
import { grpcProtoDraft } from "./requestConfigGrpcHelpers";
import {
  graphqlBodyOperationNameFromConfig,
  graphqlBodyQueryFromConfig,
  graphqlVariablesTextFromConfig,
} from "./requestConfigHttpGraphqlStateHelpers";
import { inferredHttpBodyMode } from "./requestConfigHttpBodyHelpers";
import { draftAuthFields } from "./requestConfigHttpAuthHelpers";
import { multipartPartsFromConfig } from "./requestConfigHttpMultipartHelpers";
import { webSocketMessageQueueFromConfig } from "./requestConfigWebSocketHelpers";

export function draftFromRequestConfig(
  protocol: YakuProtocol,
  config: Record<string, unknown>,
): RequestConfigDraft {
  return {
    ...grpcProtoDraft(config),
    url: stringOrEmpty(config.url),
    httpMethod:
      stringOrEmpty(config.method) || (protocol === "graphql" ? "POST" : "GET"),
    httpBody: typeof config.body === "string" ? config.body : "",
    httpBodyMode:
      stringOrEmpty(config.bodyMode) || inferredHttpBodyMode(config),
    httpBodyFilePath: stringOrEmpty(config.bodyFilePath),
    httpMultipartParts: multipartPartsFromConfig(config.multipartParts),
    httpCookieJarId: stringOrEmpty(config.cookieJarId),
    ...draftAuthFields(config.auth),
    headers: pairsFromHeaders(config.headers),
    query: pairsFromQuery(config.query),
    followRedirects: config.followRedirects !== false,
    timeoutMs:
      typeof config.timeoutMs === "number" ? String(config.timeoutMs) : "",
    graphqlQuery:
      stringOrEmpty(config.graphqlQuery) || graphqlBodyQueryFromConfig(config),
    graphqlVariables: graphqlVariablesTextFromConfig(config),
    graphqlOperationName:
      stringOrEmpty(config.graphqlOperationName) ||
      graphqlBodyOperationNameFromConfig(config),
    grpcUseReflection: config.useReflection !== false,
    webSocketMessageQueue: webSocketMessageQueueFromConfig(config),
    webSocketMaxMessages:
      typeof config.maxMessages === "number" ? String(config.maxMessages) : "1",
  };
}
