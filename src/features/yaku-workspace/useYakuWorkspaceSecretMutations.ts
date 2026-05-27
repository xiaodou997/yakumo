import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteYakuOrphanSecrets, deleteYakuSecret } from "../../lib/yaku-client";
import type { YakuWorkspaceResourceMutationParams } from "./useYakuWorkspaceResourceMutationTypes";

export function useYakuWorkspaceSecretMutations({
  selectedWorkspaceId,
  requestBuilderDraft,
  requestEditDraft,
}: Pick<
  YakuWorkspaceResourceMutationParams,
  "selectedWorkspaceId" | "requestBuilderDraft" | "requestEditDraft"
>) {
  const queryClient = useQueryClient();

  const deleteSecretMutation = useMutation({
    mutationFn: (secretId: string) => deleteYakuSecret(secretId),
    onSuccess: async (_response, secretId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["yaku", "secret-audit", selectedWorkspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "workspaces"] }),
      ]);
      if (requestEditDraft.config.httpAuthPasswordSecretId === secretId) {
        requestEditDraft.config.setHttpAuthPasswordSecretId("");
      }
      if (requestEditDraft.config.httpAuthTokenSecretId === secretId) {
        requestEditDraft.config.setHttpAuthTokenSecretId("");
      }
      if (requestBuilderDraft.config.httpAuthPasswordSecretId === secretId) {
        requestBuilderDraft.config.setHttpAuthPasswordSecretId("");
      }
      if (requestBuilderDraft.config.httpAuthTokenSecretId === secretId) {
        requestBuilderDraft.config.setHttpAuthTokenSecretId("");
      }
    },
  });

  const deleteOrphanSecretsMutation = useMutation({
    mutationFn: async () => {
      if (selectedWorkspaceId == null) {
        throw new Error("No Yaku workspace selected");
      }
      return deleteYakuOrphanSecrets(selectedWorkspaceId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["yaku", "secret-audit", selectedWorkspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "workspaces"] }),
      ]);
    },
  });

  return {
    deleteSecretMutation,
    deleteOrphanSecretsMutation,
  };
}
