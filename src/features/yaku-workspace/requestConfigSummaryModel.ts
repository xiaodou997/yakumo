import type { YakuProtocol } from "../../lib/yaku-client";
import {
  arrayLengthString,
  authTypeString,
  booleanString,
  numberString,
  splitLines,
  stringOrEmpty,
} from "./requestConfigSharedHelpers";
import { grpcProtoDraft } from "./requestConfigGrpcHelpers";
import { bodySummary } from "./requestConfigHttpBodyHelpers";
import {
  graphqlQuerySummary,
  graphqlVariablesSummary,
} from "./requestConfigHttpGraphqlStateHelpers";
import { webSocketMessageQueueFromConfig } from "./requestConfigWebSocketHelpers";

export function summarizeRequestConfig(
  protocol: YakuProtocol,
  config: Record<string, unknown>,
) {
  const url = stringOrEmpty(config.url);
  if (protocol === "grpc") {
    const grpcDraft = grpcProtoDraft(config);
    return [
      { label: "URL", value: url || "unset" },
      { label: "Service", value: stringOrEmpty(config.service) || "unset" },
      { label: "Method", value: stringOrEmpty(config.method) || "unset" },
      {
        label: "Proto Roots",
        value: arrayLengthString(splitLines(grpcDraft.grpcProtoImportRoots)),
      },
      {
        label: "Proto Files",
        value: arrayLengthString(splitLines(grpcDraft.grpcProtoFiles)),
      },
      { label: "Reflection", value: booleanString(config.useReflection) },
      { label: "Timeout", value: numberString(config.timeoutMs) },
    ];
  }
  if (protocol === "web_socket") {
    const queue = webSocketMessageQueueFromConfig(config);
    const enabledMessages = queue.filter((message) => message.enabled !== false);
    return [
      { label: "URL", value: url || "unset" },
      {
        label: "Messages",
        value:
          queue.length === 0
            ? "unset"
            : `${enabledMessages.length} enabled / ${queue.length} total`,
      },
      { label: "Max Messages", value: numberString(config.maxMessages) },
      { label: "Timeout", value: numberString(config.timeoutMs) },
    ];
  }
  if (protocol === "sse") {
    return [
      { label: "URL", value: url || "unset" },
      {
        label: "Follow Redirects",
        value: booleanString(config.followRedirects),
      },
      { label: "Timeout", value: numberString(config.timeoutMs) },
    ];
  }
  if (protocol === "graphql") {
    return [
      { label: "URL", value: url || "unset" },
      { label: "Query", value: graphqlQuerySummary(config) },
      { label: "Variables", value: graphqlVariablesSummary(config) },
      {
        label: "Operation",
        value: stringOrEmpty(config.graphqlOperationName) || "unset",
      },
      { label: "Auth", value: authTypeString(config.auth) },
      {
        label: "Cookie Jar",
        value: stringOrEmpty(config.cookieJarId) || "none",
      },
      { label: "Timeout", value: numberString(config.timeoutMs) },
    ];
  }
  return [
    { label: "Method", value: stringOrEmpty(config.method) || "unset" },
    { label: "URL", value: url || "unset" },
    { label: "Auth", value: authTypeString(config.auth) },
    { label: "Follow Redirects", value: booleanString(config.followRedirects) },
    { label: "Timeout", value: numberString(config.timeoutMs) },
    { label: "Body", value: bodySummary(config) },
    { label: "Cookie Jar", value: stringOrEmpty(config.cookieJarId) || "none" },
  ];
}
