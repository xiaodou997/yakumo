import type { Environment, EnvironmentVariable } from "@yakumo-internal/models";
import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { isBaseEnvironment, isFolderEnvironment } from "../lib/model_util";
import { useActiveEnvironment } from "./useActiveEnvironment";
import { useActiveRequest } from "./useActiveRequest";
import { environmentsByIdAtom, useEnvironmentsBreakdown } from "./useEnvironmentsBreakdown";
import { foldersByIdAtom } from "./useModelLookupMaps";
import { useParentFolders } from "./useParentFolders";

export function useEnvironmentVariables(targetEnvironmentId: string | null) {
  const { baseEnvironment, folderEnvironments } = useEnvironmentsBreakdown();
  const environmentsById = useAtomValue(environmentsByIdAtom);
  const activeEnvironment = useActiveEnvironment();
  const targetEnvironment =
    targetEnvironmentId == null ? null : (environmentsById.get(targetEnvironmentId) ?? null);
  const activeRequest = useActiveRequest();
  const foldersById = useAtomValue(foldersByIdAtom);
  const activeFolder =
    targetEnvironment?.parentId == null
      ? null
      : (foldersById.get(targetEnvironment.parentId) ?? null);
  const parentFolders = useParentFolders(activeFolder ?? activeRequest);

  return useMemo(() => {
    const varMap: Record<string, WrappedEnvironmentVariable> = {};
    const folderEnvironmentsByParentId = new Map<string, Environment>();
    for (const folderEnvironment of folderEnvironments) {
      if (folderEnvironment.parentId != null) {
        folderEnvironmentsByParentId.set(folderEnvironment.parentId, folderEnvironment);
      }
    }

    const folderVariables = parentFolders.flatMap((folder) =>
      wrapVariables(folderEnvironmentsByParentId.get(folder.id) ?? null, foldersById),
    );

    // Add active environment variables to everything except sub environments
    const activeEnvironmentVariables =
      targetEnvironment == null || // Editing request
      isFolderEnvironment(targetEnvironment) || // Editing folder variables
      isBaseEnvironment(targetEnvironment) // Editing global variables
        ? wrapVariables(activeEnvironment, foldersById)
        : wrapVariables(targetEnvironment, foldersById); // Add own variables for sub environments

    const allVariables = [
      ...folderVariables,
      ...activeEnvironmentVariables,
      ...wrapVariables(baseEnvironment, foldersById),
    ];

    for (const v of allVariables) {
      if (!v.variable.enabled || !v.variable.name || v.variable.name in varMap) {
        continue;
      }
      varMap[v.variable.name] = v;
    }

    return Object.values(varMap);
  }, [
    activeEnvironment,
    baseEnvironment,
    folderEnvironments,
    foldersById,
    parentFolders,
    targetEnvironment,
  ]);
}

export interface WrappedEnvironmentVariable {
  variable: EnvironmentVariable;
  environment: Environment;
  source: string;
}

function wrapVariables(
  e: Environment | null,
  foldersById: Map<string, { name: string }>,
): WrappedEnvironmentVariable[] {
  if (e == null) return [];
  return e.variables.map((v) => {
    const folder =
      e.parentModel === "folder" && e.parentId != null ? foldersById.get(e.parentId) : null;
    const source = folder?.name ?? e.name;
    return { variable: v, environment: e, source };
  });
}
