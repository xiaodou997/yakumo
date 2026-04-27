import { useParams } from "@tanstack/react-router";
import { workspaceMetasAtom } from "@yakumo-internal/models";
import { atom } from "jotai";
import { useEffect } from "react";
import { jotaiStore } from "../lib/jotai";
import { workspacesByIdAtom } from "./useModelLookupMaps";

export const activeWorkspaceIdAtom = atom<string | null>(null);

export const activeWorkspaceAtom = atom((get) => {
  const activeWorkspaceId = get(activeWorkspaceIdAtom);
  return activeWorkspaceId == null
    ? null
    : (get(workspacesByIdAtom).get(activeWorkspaceId) ?? null);
});

export const activeWorkspaceMetaAtom = atom((get) => {
  const activeWorkspaceId = get(activeWorkspaceIdAtom);
  const workspaceMetas = get(workspaceMetasAtom);
  return workspaceMetas.find((m) => m.workspaceId === activeWorkspaceId) ?? null;
});

export function useSubscribeActiveWorkspaceId() {
  const { workspaceId } = useParams({ strict: false });
  useEffect(() => jotaiStore.set(activeWorkspaceIdAtom, workspaceId ?? null), [workspaceId]);
}
