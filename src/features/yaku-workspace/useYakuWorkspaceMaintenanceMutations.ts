import { useMutation, useQueryClient } from "@tanstack/react-query";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  clearYakuRunRetention,
  exportYakuWorkspaceBackup,
  gcYakuBodies,
  importYakuWorkspaceBackup,
  setYakuRunRetention,
} from "../../lib/yaku-client";
import { slugFilePart } from "./useYakuWorkspaceMutationUtils";
import type { YakuWorkspaceResourceMutationParams } from "./useYakuWorkspaceResourceMutationTypes";

export function useYakuWorkspaceMaintenanceMutations({
  selectedWorkspaceId,
  selectedWorkspace,
  setSearch,
}: Pick<
  YakuWorkspaceResourceMutationParams,
  "selectedWorkspaceId" | "selectedWorkspace" | "setSearch"
>) {
  const queryClient = useQueryClient();

  const setRetentionMutation = useMutation({
    mutationFn: (keepLast: number) => {
      if (selectedWorkspaceId == null) {
        throw new Error("No Yaku workspace selected");
      }
      return setYakuRunRetention(selectedWorkspaceId, keepLast);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "run-retention", selectedWorkspaceId] });
    },
  });

  const clearRetentionMutation = useMutation({
    mutationFn: () => {
      if (selectedWorkspaceId == null) {
        throw new Error("No Yaku workspace selected");
      }
      return clearYakuRunRetention(selectedWorkspaceId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "run-retention", selectedWorkspaceId] });
    },
  });

  const gcBodiesMutation = useMutation({
    mutationFn: () => gcYakuBodies(false),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["yaku", "run-bodies"] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "run-body-bytes"] }),
      ]);
    },
  });

  const exportBackupMutation = useMutation({
    mutationFn: async () => {
      if (selectedWorkspace == null) {
        throw new Error("No Yaku workspace selected");
      }
      const exportPath = await save({
        title: "Export Yaku Workspace Backup",
        defaultPath: `yaku.${slugFilePart(selectedWorkspace.name)}.json`,
        filters: [{ name: "Yaku Workspace Backup", extensions: ["json"] }],
      });
      if (exportPath == null) {
        return null;
      }
      return exportYakuWorkspaceBackup(selectedWorkspace.id, exportPath);
    },
  });

  const importBackupMutation = useMutation({
    mutationFn: async () => {
      const filePath = await open({
        title: "Import Yaku Workspace Backup",
        multiple: false,
        filters: [{ name: "Yaku Workspace Backup", extensions: ["json"] }],
      });
      if (typeof filePath !== "string") {
        return null;
      }
      return importYakuWorkspaceBackup(filePath, true);
    },
    onSuccess: async (response) => {
      if (response == null) {
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["yaku", "workspaces"] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "requests", response.workspace.id] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "environments", response.workspace.id] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "run-retention", response.workspace.id] }),
      ]);
      setSearch({
        workspaceId: response.workspace.id,
        folderId: undefined,
        requestId: undefined,
        runId: undefined,
        environmentId: undefined,
      });
    },
  });

  return {
    setRetentionMutation,
    clearRetentionMutation,
    gcBodiesMutation,
    exportBackupMutation,
    importBackupMutation,
  };
}
