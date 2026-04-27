import { atom } from "jotai";
import { activeFolderIdAtom } from "./useActiveFolderId";
import { foldersByIdAtom } from "./useModelLookupMaps";

export const activeFolderAtom = atom((get) => {
  const activeFolderId = get(activeFolderIdAtom);
  return activeFolderId == null ? null : (get(foldersByIdAtom).get(activeFolderId) ?? null);
});
