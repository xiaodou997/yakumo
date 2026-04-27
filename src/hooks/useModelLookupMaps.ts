import type { Folder, Workspace } from "@yakumo-internal/models";
import { foldersAtom, workspacesAtom } from "@yakumo-internal/models";
import { atom } from "jotai";

export const foldersByIdAtom = atom((get) => {
  const foldersById = new Map<string, Folder>();
  for (const folder of get(foldersAtom)) {
    foldersById.set(folder.id, folder);
  }
  return foldersById;
});

export const workspacesByIdAtom = atom((get) => {
  const workspacesById = new Map<string, Workspace>();
  for (const workspace of get(workspacesAtom)) {
    workspacesById.set(workspace.id, workspace);
  }
  return workspacesById;
});

export const ancestorModelsByIdAtom = atom((get) => {
  const modelsById = new Map<string, Folder | Workspace>();
  for (const folder of get(foldersAtom)) {
    modelsById.set(folder.id, folder);
  }
  for (const workspace of get(workspacesAtom)) {
    modelsById.set(workspace.id, workspace);
  }
  return modelsById;
});
