import type { YakuWorkspaceResourceMutationParams } from "./useYakuWorkspaceResourceMutationTypes";
import { useYakuWorkspaceCookieMutations } from "./useYakuWorkspaceCookieMutations";
import { useYakuWorkspaceMaintenanceMutations } from "./useYakuWorkspaceMaintenanceMutations";
import { useYakuWorkspaceRequestMutations } from "./useYakuWorkspaceRequestMutations";
import { useYakuWorkspaceSecretMutations } from "./useYakuWorkspaceSecretMutations";
import { useYakuWorkspaceTreeMutations } from "./useYakuWorkspaceTreeMutations";
import { useYakuWorkspaceWorkspaceMutations } from "./useYakuWorkspaceWorkspaceMutations";

export function useYakuWorkspaceResourceMutations(params: YakuWorkspaceResourceMutationParams) {
  const workspaceMutations = useYakuWorkspaceWorkspaceMutations(params);
  const cookieMutations = useYakuWorkspaceCookieMutations(params);
  const treeMutations = useYakuWorkspaceTreeMutations(params);
  const requestMutations = useYakuWorkspaceRequestMutations(params);
  const secretMutations = useYakuWorkspaceSecretMutations(params);
  const maintenanceMutations = useYakuWorkspaceMaintenanceMutations(params);

  return {
    ...workspaceMutations,
    ...cookieMutations,
    ...treeMutations,
    ...requestMutations,
    ...secretMutations,
    ...maintenanceMutations,
  };
}
