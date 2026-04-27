import type {
  Folder,
  GrpcRequest,
  HttpRequest,
  HttpRequestHeader,
  WebsocketRequest,
  Workspace,
} from "@yakumo-internal/models";
import { useAtomValue } from "jotai";
import { defaultHeaders } from "../lib/defaultHeaders";
import { ancestorModelsByIdAtom } from "./useModelLookupMaps";

export type HeaderModel = HttpRequest | GrpcRequest | WebsocketRequest | Folder | Workspace;

export function useInheritedHeaders(baseModel: HeaderModel | null) {
  const parentsById = useAtomValue(ancestorModelsByIdAtom);

  if (baseModel == null) return [];
  if (baseModel.model === "workspace") return defaultHeaders;

  const next = (child: HeaderModel): HttpRequestHeader[] => {
    // Short-circuit at workspace level - return global defaults + workspace headers
    if (child.model === "workspace") {
      return [...defaultHeaders, ...child.headers];
    }

    // Recurse up the tree
    const parent = child.folderId
      ? parentsById.get(child.folderId)
      : parentsById.get(child.workspaceId);

    // Failed to find parent (should never happen)
    if (parent == null) {
      return [];
    }

    const headers = next(parent);
    return [...headers, ...parent.headers];
  };

  const allHeaders = next(baseModel);

  // Deduplicate by header name (case-insensitive), keeping the latest (most specific) value
  const headersByName = new Map<string, HttpRequestHeader>();
  for (const header of allHeaders) {
    headersByName.set(header.name.toLowerCase(), header);
  }

  return Array.from(headersByName.values());
}
