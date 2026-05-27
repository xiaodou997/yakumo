import type { YakuRunEvent } from "../../lib/yaku-client";
import {
  arrayLength,
  asOptionalBoolean,
  asOptionalNumber,
  asOptionalString,
} from "./RunEventParserCommon";

export function parseGrpcRequestHeaderEvent(event: YakuRunEvent) {
  if (event.kind !== "request_headers") {
    return null;
  }
  const service = asOptionalString(event.data.service);
  const method = asOptionalString(event.data.method);
  const url = asOptionalString(event.data.url);
  if (service == null || method == null || url == null) {
    return null;
  }
  return {
    url,
    service,
    method,
    metadataCount: arrayLength(event.data.metadata),
    protoRootCount: arrayLength(event.data.protoImportRoots),
    protoFileCount: arrayLength(event.data.protoFiles),
    useReflection: asOptionalBoolean(event.data.useReflection) ?? false,
    timeoutMs: asOptionalNumber(event.data.timeoutMs),
  };
}

export function parseRequestBodyEvent(event: YakuRunEvent) {
  if (event.kind !== "request_body") {
    return null;
  }
  const mode = asOptionalString(event.data.mode);
  const grpcJson = asOptionalString(event.data.json);
  if (grpcJson != null) {
    return {
      kind: "grpc" as const,
      text: grpcJson,
    };
  }
  if (mode == null) {
    return null;
  }
  if (mode === "file") {
    return {
      kind: "file" as const,
      byteLength: asOptionalNumber(event.data.byteLength),
      filePath: asOptionalString(event.data.filePath),
    };
  }
  if (mode === "multipart") {
    return {
      kind: "multipart" as const,
      partCount: arrayLength(event.data.parts),
    };
  }
  const text = asOptionalString(event.data.text);
  if (text == null) {
    return null;
  }
  return {
    kind:
      mode === "graphql"
        ? ("graphql" as const)
        : mode === "json"
          ? ("json" as const)
          : ("text" as const),
    byteLength: asOptionalNumber(event.data.byteLength),
    text,
    graphql: mode === "graphql" ? parseGraphqlPayloadText(text) : null,
  };
}

export function parseGrpcMessageEvent(event: YakuRunEvent) {
  if (event.kind !== "message") {
    return null;
  }
  const direction = asOptionalString(event.data.direction);
  if (direction !== "received" || !("json" in event.data)) {
    return null;
  }
  const payload = event.data.json;
  if (payload != null && typeof payload === "object" && !Array.isArray(payload)) {
    const type = asOptionalString((payload as Record<string, unknown>).type);
    if (type === "reflection_services") {
      const services = Array.isArray((payload as Record<string, unknown>).services)
        ? ((payload as Record<string, unknown>).services as unknown[]).filter(
            (service): service is string => typeof service === "string",
          )
        : [];
      return {
        type: "reflection_services" as const,
        services,
      };
    }
  }
  return {
    type: "json" as const,
    json: payload,
  };
}

function parseGraphqlPayloadText(text: string) {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed == null || Array.isArray(parsed) || typeof parsed !== "object") {
      return null;
    }
    const body = parsed as Record<string, unknown>;
    return {
      query: asOptionalString(body.query),
      operationName: asOptionalString(body.operationName),
      hasVariables: body.variables != null,
    };
  } catch {
    return null;
  }
}
