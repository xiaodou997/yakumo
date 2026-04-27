import type {
  Folder,
  GrpcRequest,
  HttpRequest,
  WebsocketRequest,
  Workspace,
} from "@yakumo-internal/models";
import { useAtomValue } from "jotai";
import { ancestorModelsByIdAtom } from "./useModelLookupMaps";

export type AuthenticatedModel = HttpRequest | GrpcRequest | WebsocketRequest | Folder | Workspace;

export function useInheritedAuthentication(baseModel: AuthenticatedModel | null) {
  const parentsById = useAtomValue(ancestorModelsByIdAtom);

  if (baseModel == null) return null;

  const next = (child: AuthenticatedModel) => {
    // We hit the top
    if (child.model === "workspace") {
      return child.authenticationType == null ? null : child;
    }

    // Has valid auth
    if (child.authenticationType !== null) {
      return child;
    }

    // Recurse up the tree
    const parent = child.folderId
      ? parentsById.get(child.folderId)
      : parentsById.get(child.workspaceId);

    // Failed to find parent (should never happen)
    if (parent == null) {
      return null;
    }

    return next(parent);
  };

  return next(baseModel);
}
