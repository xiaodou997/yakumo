import type { CookieJar, Folder, Workspace, WorkspaceMeta } from "@yakumo-internal/models";
import {
  cookieJarsAtom,
  foldersAtom,
  workspaceMetasAtom,
  workspacesAtom,
} from "@yakumo-internal/models";
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

export const workspaceMetasByWorkspaceIdAtom = atom((get) => {
  const workspaceMetasByWorkspaceId = new Map<string, WorkspaceMeta>();
  for (const workspaceMeta of get(workspaceMetasAtom)) {
    workspaceMetasByWorkspaceId.set(workspaceMeta.workspaceId, workspaceMeta);
  }
  return workspaceMetasByWorkspaceId;
});

export const cookieJarsByIdAtom = atom((get) => {
  const cookieJarsById = new Map<string, CookieJar>();
  for (const cookieJar of get(cookieJarsAtom)) {
    cookieJarsById.set(cookieJar.id, cookieJar);
  }
  return cookieJarsById;
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
