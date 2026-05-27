import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createYakuEnvironment,
  createYakuWorkspace,
  deleteYakuEnvironment,
  updateYakuEnvironment,
} from "../../lib/yaku-client";
import { parseJsonObject } from "./useYakuWorkspaceMutationUtils";
import type { YakuWorkspaceResourceMutationParams } from "./useYakuWorkspaceResourceMutationTypes";

export function useYakuWorkspaceWorkspaceMutations({
  selectedWorkspaceId,
  selectedEnvironmentId,
  workspaceName,
  environmentName,
  environmentVariablesText,
  setSearch,
}: Pick<
  YakuWorkspaceResourceMutationParams,
  | "selectedWorkspaceId"
  | "selectedEnvironmentId"
  | "workspaceName"
  | "environmentName"
  | "environmentVariablesText"
  | "setSearch"
>) {
  const queryClient = useQueryClient();

  const createWorkspaceMutation = useMutation({
    mutationFn: () => createYakuWorkspace(workspaceName.trim() || "New Workspace"),
    onSuccess: async (workspace) => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "workspaces"] });
      setSearch({
        workspaceId: workspace.id,
        folderId: undefined,
        requestId: undefined,
        runId: undefined,
        environmentId: undefined,
      });
    },
  });

  const createEnvironmentMutation = useMutation({
    mutationFn: () => {
      if (selectedWorkspaceId == null) {
        throw new Error("No Yaku workspace selected");
      }
      return createYakuEnvironment(
        selectedWorkspaceId,
        environmentName.trim() || "New Environment",
        parseJsonObject(environmentVariablesText, "Environment variables"),
      );
    },
    onSuccess: async (environment) => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "environments", selectedWorkspaceId] });
      setSearch({ environmentId: environment.id });
    },
  });

  const updateEnvironmentMutation = useMutation({
    mutationFn: () => {
      if (selectedEnvironmentId == null) {
        throw new Error("No Yaku environment selected");
      }
      return updateYakuEnvironment(selectedEnvironmentId, {
        name: environmentName.trim() || "Environment",
        variables: parseJsonObject(environmentVariablesText, "Environment variables"),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "environments", selectedWorkspaceId] });
    },
  });

  const deleteEnvironmentMutation = useMutation({
    mutationFn: () => {
      if (selectedEnvironmentId == null) {
        throw new Error("No Yaku environment selected");
      }
      return deleteYakuEnvironment(selectedEnvironmentId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "environments", selectedWorkspaceId] });
      setSearch({ environmentId: undefined });
    },
  });

  return {
    createWorkspaceMutation,
    createEnvironmentMutation,
    updateEnvironmentMutation,
    deleteEnvironmentMutation,
  };
}
