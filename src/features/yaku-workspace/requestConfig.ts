import type { YakuProtocol } from "../../lib/yaku-client";
import type { ConfigPair } from "./types";

export type MultipartPart = {
  id: string;
  name: string;
  kind: "text" | "file";
  value: string;
  filePath: string;
  fileName: string;
  contentType: string;
  enabled: boolean;
};

export type RequestConfigDraft = {
  url: string;
  httpMethod: string;
  httpBody: string;
  httpBodyMode: string;
  httpBodyFilePath: string;
  httpMultipartParts: MultipartPart[];
  httpAuthType: string;
  httpAuthUsername: string;
  httpAuthPassword: string;
  httpAuthToken: string;
  httpAuthPasswordSecretId: string;
  httpAuthTokenSecretId: string;
  headers: ConfigPair[];
  query: ConfigPair[];
  followRedirects: boolean;
  timeoutMs: string;
  grpcService: string;
  grpcMethod: string;
  grpcMessage: string;
  grpcMetadata: ConfigPair[];
  grpcProtoFiles: string;
  grpcUseReflection: boolean;
  webSocketMessages: string;
  webSocketMaxMessages: string;
};

export type RequestConfigDraftController = RequestConfigDraft & {
  setUrl: (value: string) => void;
  setHttpMethod: (value: string) => void;
  setHttpBody: (value: string) => void;
  setHttpBodyMode: (value: string) => void;
  setHttpBodyFilePath: (value: string) => void;
  setHttpMultipartParts: (parts: MultipartPart[]) => void;
  setHttpAuthType: (value: string) => void;
  setHttpAuthUsername: (value: string) => void;
  setHttpAuthPassword: (value: string) => void;
  setHttpAuthToken: (value: string) => void;
  setHttpAuthPasswordSecretId: (value: string) => void;
  setHttpAuthTokenSecretId: (value: string) => void;
  setHeaders: (pairs: ConfigPair[]) => void;
  setQuery: (pairs: ConfigPair[]) => void;
  setFollowRedirects: (value: boolean) => void;
  setTimeoutMs: (value: string) => void;
  setGrpcService: (value: string) => void;
  setGrpcMethod: (value: string) => void;
  setGrpcMessage: (value: string) => void;
  setGrpcMetadata: (pairs: ConfigPair[]) => void;
  setGrpcProtoFiles: (value: string) => void;
  setGrpcUseReflection: (value: boolean) => void;
  setWebSocketMessages: (value: string) => void;
  setWebSocketMaxMessages: (value: string) => void;
};

export function buildRequestConfigDraft(input: RequestConfigDraft & {
  protocol: YakuProtocol;
}): Record<string, unknown> {
  const timeout = parseOptionalInteger(input.timeoutMs);
  const trimmedUrl = input.url.trim();
  if (input.protocol === "grpc") {
    return {
      url: trimmedUrl,
      service: input.grpcService.trim(),
      method: input.grpcMethod.trim(),
      metadata: pairsToHeaders(input.grpcMetadata),
      message: input.grpcMessage.trim() === "" ? null : input.grpcMessage,
      protoFiles: splitLines(input.grpcProtoFiles),
      useReflection: input.grpcUseReflection,
      timeoutMs: timeout ?? 30_000,
    };
  }

  if (input.protocol === "web_socket") {
    return {
      url: trimmedUrl,
      headers: pairsToHeaders(input.headers),
      query: pairsToQueryParams(input.query),
      messages: splitLines(input.webSocketMessages),
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

  const bodyMode = normalizedHttpBodyMode(input);
  return {
    method: input.protocol === "graphql" ? "POST" : input.httpMethod.trim() || "GET",
    url: trimmedUrl,
    headers: pairsToHeaders(input.headers),
    query: pairsToQueryParams(input.query),
    bodyMode,
    body:
      bodyMode === "file" || bodyMode === "multipart"
        ? null
        : input.httpBody.trim() === "" ? null : input.httpBody,
    bodyFilePath: bodyMode === "file"
      ? input.httpBodyFilePath.trim() || null
      : null,
    multipartParts: bodyMode === "multipart" ? multipartPartsToConfig(input.httpMultipartParts) : [],
    auth: buildHttpAuth(input),
    followRedirects: input.followRedirects,
    timeoutMs: timeout,
  };
}

export function summarizeRequestConfig(protocol: YakuProtocol, config: Record<string, unknown>) {
  const url = stringOrEmpty(config.url);
  if (protocol === "grpc") {
    return [
      { label: "URL", value: url || "unset" },
      { label: "Service", value: stringOrEmpty(config.service) || "unset" },
      { label: "Method", value: stringOrEmpty(config.method) || "unset" },
      { label: "Proto Files", value: arrayLengthString(config.protoFiles) },
      { label: "Reflection", value: booleanString(config.useReflection) },
      { label: "Timeout", value: numberString(config.timeoutMs) },
    ];
  }
  if (protocol === "web_socket") {
    return [
      { label: "URL", value: url || "unset" },
      { label: "Messages", value: arrayLengthString(config.messages) },
      { label: "Max Messages", value: numberString(config.maxMessages) },
      { label: "Timeout", value: numberString(config.timeoutMs) },
    ];
  }
  if (protocol === "sse") {
    return [
      { label: "URL", value: url || "unset" },
      { label: "Follow Redirects", value: booleanString(config.followRedirects) },
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
  ];
}

export function draftFromRequestConfig(
  protocol: YakuProtocol,
  config: Record<string, unknown>,
): RequestConfigDraft {
  return {
    url: stringOrEmpty(config.url),
    httpMethod: stringOrEmpty(config.method) || (protocol === "graphql" ? "POST" : "GET"),
    httpBody: typeof config.body === "string" ? config.body : "",
    httpBodyMode: stringOrEmpty(config.bodyMode) || inferredHttpBodyMode(config),
    httpBodyFilePath: stringOrEmpty(config.bodyFilePath),
    httpMultipartParts: multipartPartsFromConfig(config.multipartParts),
    ...draftAuthFields(config.auth),
    headers: pairsFromHeaders(config.headers),
    query: pairsFromQuery(config.query),
    followRedirects: config.followRedirects !== false,
    timeoutMs: typeof config.timeoutMs === "number" ? String(config.timeoutMs) : "",
    grpcService: stringOrEmpty(config.service),
    grpcMethod: stringOrEmpty(config.method),
    grpcMessage: typeof config.message === "string" ? config.message : "",
    grpcMetadata: pairsFromHeaders(config.metadata),
    grpcProtoFiles: Array.isArray(config.protoFiles)
      ? config.protoFiles.filter((path) => typeof path === "string").join("\n")
      : "",
    grpcUseReflection: config.useReflection !== false,
    webSocketMessages: Array.isArray(config.messages)
      ? config.messages.filter((message) => typeof message === "string").join("\n")
      : "",
    webSocketMaxMessages: typeof config.maxMessages === "number" ? String(config.maxMessages) : "1",
  };
}

function normalizedHttpBodyMode(input: RequestConfigDraft) {
  const mode = input.httpBodyMode.trim().toLowerCase();
  if (mode === "" || mode === "none") return "text";
  return mode;
}

function bodySummary(config: Record<string, unknown>) {
  const mode = stringOrEmpty(config.bodyMode) || inferredHttpBodyMode(config);
  if (mode === "file") {
    return stringOrEmpty(config.bodyFilePath) === "" ? "file missing" : "file";
  }
  if (mode === "multipart") {
    return multipartSummary(config.multipartParts);
  }
  return config.body == null ? "empty" : `${mode} set`;
}

function inferredHttpBodyMode(config: Record<string, unknown>) {
  if (Array.isArray(config.multipartParts) && config.multipartParts.length > 0) {
    return "multipart";
  }
  return config.bodyFilePath == null ? "text" : "file";
}

function multipartSummary(value: unknown) {
  if (!Array.isArray(value)) return "multipart";
  const enabledParts = value.filter((item) => {
    if (item == null || typeof item !== "object") return false;
    return (item as Record<string, unknown>).enabled !== false;
  });
  return enabledParts.length === 0 ? "multipart empty" : `${enabledParts.length} parts`;
}

function buildHttpAuth(input: RequestConfigDraft) {
  const authType = input.httpAuthType.trim().toLowerCase();
  if (authType === "" || authType === "none") {
    return null;
  }
  if (authType === "basic") {
    return {
      type: "basic",
      username: input.httpAuthUsername,
      password: input.httpAuthPassword.trim() === "" ? undefined : input.httpAuthPassword,
      passwordSecretId:
        input.httpAuthPassword.trim() === "" ? input.httpAuthPasswordSecretId || undefined : undefined,
    };
  }
  if (authType === "bearer") {
    return {
      type: "bearer",
      token: input.httpAuthToken.trim() === "" ? undefined : input.httpAuthToken,
      tokenSecretId:
        input.httpAuthToken.trim() === "" ? input.httpAuthTokenSecretId || undefined : undefined,
    };
  }
  return { type: authType };
}

function draftAuthFields(value: unknown) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return {
      httpAuthType: "none",
      httpAuthUsername: "",
      httpAuthPassword: "",
      httpAuthToken: "",
      httpAuthPasswordSecretId: "",
      httpAuthTokenSecretId: "",
    };
  }
  const auth = value as Record<string, unknown>;
  return {
    httpAuthType: stringOrEmpty(auth.type) || "none",
    httpAuthUsername: stringOrEmpty(auth.username),
    httpAuthPassword: stringOrEmpty(auth.password),
    httpAuthToken: stringOrEmpty(auth.token),
    httpAuthPasswordSecretId: stringOrEmpty(auth.passwordSecretId),
    httpAuthTokenSecretId: stringOrEmpty(auth.tokenSecretId),
  };
}

function multipartPartsToConfig(parts: MultipartPart[]) {
  return parts
    .filter((part) => part.name.trim() !== "")
    .map((part) => ({
      name: part.name.trim(),
      kind: part.kind,
      value: part.kind === "text" ? part.value : null,
      filePath: part.kind === "file" ? part.filePath.trim() || null : null,
      fileName: part.fileName.trim() || null,
      contentType: part.contentType.trim() || null,
      enabled: part.enabled !== false,
    }));
}

function multipartPartsFromConfig(value: unknown): MultipartPart[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => item != null && typeof item === "object")
    .map((item) =>
      createMultipartPart({
        name: stringOrEmpty(item.name),
        kind: stringOrEmpty(item.kind) === "file" ? "file" : "text",
        value: stringOrEmpty(item.value),
        filePath: stringOrEmpty(item.filePath),
        fileName: stringOrEmpty(item.fileName),
        contentType: stringOrEmpty(item.contentType),
        enabled: item.enabled !== false,
      }),
    );
}

export function createConfigPair(pair: Partial<ConfigPair> = {}) {
  return {
    id: pair.id ?? `pair_${Math.random().toString(16).slice(2)}`,
    name: pair.name ?? "",
    value: pair.value ?? "",
    enabled: pair.enabled ?? true,
  };
}

export function updateConfigPair(
  pairs: ConfigPair[],
  setPairs: (pairs: ConfigPair[]) => void,
  id: string,
  patch: Partial<ConfigPair>,
) {
  setPairs(
    pairs.map((pair) =>
      pair.id === id ? { ...pair, ...patch, enabled: patch.enabled ?? pair.enabled } : pair,
    ),
  );
}

export function createMultipartPart(part: Partial<MultipartPart> = {}): MultipartPart {
  return {
    id: part.id ?? `mp_${Math.random().toString(16).slice(2)}`,
    name: part.name ?? "",
    kind: part.kind ?? "text",
    value: part.value ?? "",
    filePath: part.filePath ?? "",
    fileName: part.fileName ?? "",
    contentType: part.contentType ?? "",
    enabled: part.enabled ?? true,
  };
}

export function updateMultipartPart(
  parts: MultipartPart[],
  setParts: (parts: MultipartPart[]) => void,
  id: string,
  patch: Partial<MultipartPart>,
) {
  setParts(parts.map((part) => (part.id === id ? { ...part, ...patch } : part)));
}

function pairsToHeaders(pairs: ConfigPair[]) {
  return pairs
    .map((pair) => ({ name: pair.name.trim(), value: pair.value }))
    .filter((pair) => pair.name !== "");
}

function pairsToQueryParams(pairs: ConfigPair[]) {
  return pairs
    .map((pair) => ({
      name: pair.name.trim(),
      value: pair.value,
      enabled: pair.enabled !== false,
    }))
    .filter((pair) => pair.name !== "");
}

function pairsFromHeaders(value: unknown): ConfigPair[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => item != null && typeof item === "object")
    .map((item) =>
      createConfigPair({
        name: stringOrEmpty(item.name),
        value: stringOrEmpty(item.value),
      }),
    );
}

function pairsFromQuery(value: unknown): ConfigPair[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => item != null && typeof item === "object")
    .map((item) =>
      createConfigPair({
        name: stringOrEmpty(item.name),
        value: stringOrEmpty(item.value),
        enabled: item.enabled !== false,
      }),
    );
}

function parseOptionalInteger(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    throw new Error(`Invalid integer: ${value}`);
  }
  return parsed;
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}

function booleanString(value: unknown) {
  return value === true ? "true" : value === false ? "false" : "unset";
}

function authTypeString(value: unknown) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return "none";
  }
  return stringOrEmpty((value as Record<string, unknown>).type) || "none";
}

function numberString(value: unknown) {
  return typeof value === "number" ? value.toLocaleString() : "unset";
}

function arrayLengthString(value: unknown) {
  return Array.isArray(value) ? `${value.length} items` : "unset";
}
