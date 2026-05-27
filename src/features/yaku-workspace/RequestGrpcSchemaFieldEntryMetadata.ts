import type { JsonSchemaNode } from "./RequestGrpcSchemaTypes";

export function buildGrpcSchemaEntryMetadata(
  path: string,
  node: JsonSchemaNode,
) {
  return {
    path,
    displayName: grpcSchemaDisplayName(path),
    parentPath: grpcSchemaParentPath(path),
    depth: grpcSchemaDepth(path),
    kind: grpcSchemaNodeKind(node),
    isContainer: grpcSchemaNodeIsContainer(node),
  };
}

export function formatGrpcSchemaExample(value: unknown) {
  if (typeof value === "string") {
    return value === "" ? '""' : value;
  }
  try {
    return truncateLine(JSON.stringify(value), 96);
  } catch {
    return "unavailable";
  }
}

function truncateLine(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function grpcSchemaDepth(path: string) {
  return path.split(".").filter((segment) => segment !== "").length - 1;
}

function grpcSchemaDisplayName(path: string) {
  const segments = path.split(".").filter((segment) => segment !== "");
  return segments[segments.length - 1] ?? path;
}

function grpcSchemaParentPath(path: string) {
  const segments = path.split(".").filter((segment) => segment !== "");
  if (segments.length <= 1) {
    return null;
  }
  return segments.slice(0, -1).join(".");
}

function grpcSchemaNodeKind(node: JsonSchemaNode) {
  if (Array.isArray(node.enum) && node.enum.length > 0) {
    return "enum";
  }
  if (node.type === "array") {
    return "array";
  }
  if (node.type === "object") {
    return "object";
  }
  if (node.type === "string" && node.format != null && node.format !== "") {
    return `string:${node.format}`;
  }
  return node.type ?? "object";
}

function grpcSchemaNodeIsContainer(node: JsonSchemaNode) {
  return node.type === "object" || node.type === "array";
}
