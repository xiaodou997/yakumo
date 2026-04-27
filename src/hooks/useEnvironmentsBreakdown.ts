import type { Environment } from "@yakumo-internal/models";
import { environmentsAtom } from "@yakumo-internal/models";
import { atom, useAtomValue } from "jotai";

export const environmentsByIdAtom = atom((get) => {
  const environmentsById = new Map<string, Environment>();
  for (const environment of get(environmentsAtom)) {
    environmentsById.set(environment.id, environment);
  }
  return environmentsById;
});

export const environmentsBreakdownAtom = atom((get) => {
  const allEnvironments = get(environmentsAtom);
  const baseEnvironments: Environment[] = [];
  const subEnvironments: Environment[] = [];
  const folderEnvironments: Environment[] = [];
  const folderEnvironmentsByParentId = new Map<string, Environment>();
  const subEnvironmentIdsByWorkspaceId = new Map<string, Set<string>>();

  for (const environment of allEnvironments) {
    if (environment.parentModel === "workspace") {
      baseEnvironments.push(environment);
    } else if (environment.parentModel === "environment") {
      subEnvironments.push(environment);
      addId(subEnvironmentIdsByWorkspaceId, environment.workspaceId, environment.id);
    } else if (environment.parentModel === "folder" && environment.parentId != null) {
      folderEnvironments.push(environment);
      folderEnvironmentsByParentId.set(environment.parentId, environment);
    }
  }

  subEnvironments.sort((a, b) => {
    if (a.sortPriority === b.sortPriority) {
      return a.updatedAt > b.updatedAt ? 1 : -1;
    }
    return a.sortPriority - b.sortPriority;
  });

  const baseEnvironment = baseEnvironments[0] ?? null;
  const otherBaseEnvironments =
    baseEnvironment == null ? baseEnvironments : baseEnvironments.slice(1);
  return {
    allEnvironments,
    baseEnvironment,
    subEnvironments,
    folderEnvironments,
    folderEnvironmentsByParentId,
    subEnvironmentIdsByWorkspaceId,
    otherBaseEnvironments,
    baseEnvironments,
  };
});

export function useEnvironmentsBreakdown() {
  return useAtomValue(environmentsBreakdownAtom);
}

function addId(idsByKey: Map<string, Set<string>>, key: string, id: string) {
  const ids = idsByKey.get(key);
  if (ids == null) {
    idsByKey.set(key, new Set([id]));
  } else {
    ids.add(id);
  }
}
