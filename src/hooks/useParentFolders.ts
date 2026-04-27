import type { Folder, GrpcRequest, HttpRequest, WebsocketRequest } from "@yakumo-internal/models";
import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { foldersByIdAtom } from "./useModelLookupMaps";

export function useParentFolders(m: Folder | HttpRequest | GrpcRequest | WebsocketRequest | null) {
  const foldersById = useAtomValue(foldersByIdAtom);

  return useMemo(() => getParentFolders(foldersById, m), [foldersById, m]);
}

function getParentFolders(
  foldersById: Map<string, Folder>,
  currentModel: Folder | HttpRequest | GrpcRequest | WebsocketRequest | null,
): Folder[] {
  if (currentModel == null) return [];

  const parentFolder = currentModel.folderId ? foldersById.get(currentModel.folderId) : null;
  if (parentFolder == null) {
    return [];
  }

  return [parentFolder, ...getParentFolders(foldersById, parentFolder)];
}
