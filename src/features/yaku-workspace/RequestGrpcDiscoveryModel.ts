import type {
  YakuGrpcMethodDefinition,
  YakuGrpcServiceDefinition,
} from "../../lib/yaku-client";
import type { ConfigPair } from "./types";

export function splitNonEmptyLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

export function normalizeDialogPaths(value: string | string[] | null): string[] {
  if (value == null) {
    return [];
  }
  return joinUniquePaths(Array.isArray(value) ? value : [value]);
}

export function joinPathLines(paths: string[]) {
  return joinUniquePaths(paths).join("\n");
}

export function grpcMetadataMap(pairs: ConfigPair[]): Record<string, string> {
  return Object.fromEntries(
    pairs
      .map((pair) => [pair.name.trim(), pair.value] as const)
      .filter(([name]) => name !== ""),
  );
}

export function filterDiscoveredServices(
  services: YakuGrpcServiceDefinition[],
  filterText: string,
) {
  const query = filterText.trim().toLowerCase();
  if (query === "") {
    return services;
  }

  return services.flatMap((service) => {
    const matchesService = service.name.toLowerCase().includes(query);
    const methods = matchesService
      ? service.methods
      : service.methods.filter((method) =>
          method.name.toLowerCase().includes(query),
        );

    return methods.length === 0 ? [] : [{ ...service, methods }];
  });
}

export function streamingLabel(method: YakuGrpcMethodDefinition) {
  if (method.clientStreaming && method.serverStreaming) {
    return "bidirectional stream";
  }
  if (method.clientStreaming) {
    return "client stream";
  }
  if (method.serverStreaming) {
    return "server stream";
  }
  return "unary";
}

export function grpcMethodShape(method: YakuGrpcMethodDefinition) {
  return method.clientStreaming || method.serverStreaming
    ? "streaming"
    : "unary";
}

function joinUniquePaths(paths: string[]) {
  const seen = new Set<string>();
  return paths
    .map((path) => path.trim())
    .filter((path) => path !== "")
    .filter((path) => {
      if (seen.has(path)) {
        return false;
      }
      seen.add(path);
      return true;
    });
}
