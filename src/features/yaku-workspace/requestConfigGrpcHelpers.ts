import { pairsFromHeaders } from "./requestConfigSharedHelpers";
import { stringOrEmpty } from "./requestConfigSharedHelpers";

export function grpcProtoDraft(config: Record<string, unknown>) {
  const protoEntries = stringArray(config.protoFiles);
  const configuredRoots = stringArray(config.protoImportRoots);
  const hasExplicitRoots = configuredRoots.length > 0;

  const protoFiles = hasExplicitRoots
    ? protoEntries
    : protoEntries.filter((entry) => entry.endsWith(".proto"));
  const protoImportRoots = hasExplicitRoots
    ? configuredRoots
    : protoEntries.filter((entry) => !entry.endsWith(".proto"));

  return {
    grpcService: stringOrEmpty(config.service),
    grpcMethod: stringOrEmpty(config.method),
    grpcMessage: typeof config.message === "string" ? config.message : "",
    grpcMetadata: pairsFromHeaders(config.metadata),
    grpcProtoImportRoots: protoImportRoots.join("\n"),
    grpcProtoFiles: protoFiles.join("\n"),
  };
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
