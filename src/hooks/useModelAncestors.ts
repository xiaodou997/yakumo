import type { AnyModel, Folder, Workspace } from "@yakumo-internal/models";
import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { foldersByIdAtom, workspacesByIdAtom } from "./useModelLookupMaps";

type ModelAncestor = Folder | Workspace;

export function useModelAncestors(m: AnyModel | null) {
  const foldersById = useAtomValue(foldersByIdAtom);
  const workspacesById = useAtomValue(workspacesByIdAtom);

  return useMemo(
    () => getModelAncestorsFromMaps(foldersById, workspacesById, m),
    [foldersById, workspacesById, m],
  );
}

function getModelAncestorsFromMaps(
  foldersById: Map<string, Folder>,
  workspacesById: Map<string, Workspace>,
  currentModel: AnyModel | null,
): ModelAncestor[] {
  if (currentModel == null) return [];

  const parentFolder =
    "folderId" in currentModel && currentModel.folderId
      ? foldersById.get(currentModel.folderId)
      : null;

  if (parentFolder != null) {
    return [parentFolder, ...getModelAncestorsFromMaps(foldersById, workspacesById, parentFolder)];
  }

  const parentWorkspace =
    "workspaceId" in currentModel && currentModel.workspaceId
      ? workspacesById.get(currentModel.workspaceId)
      : null;

  if (parentWorkspace != null) {
    return [
      parentWorkspace,
      ...getModelAncestorsFromMaps(foldersById, workspacesById, parentWorkspace),
    ];
  }

  return [];
}

export function getModelAncestors(
  folders: Folder[],
  workspaces: Workspace[],
  currentModel: AnyModel | null,
): ModelAncestor[] {
  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  const workspacesById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
  return getModelAncestorsFromMaps(foldersById, workspacesById, currentModel);
}
