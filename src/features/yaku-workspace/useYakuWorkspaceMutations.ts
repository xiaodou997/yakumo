import type { YakuRequest, YakuRequestNodePageItem, YakuWorkspace } from "../../lib/yaku-client";
import type { RequestBuilderDraft, RequestEditDraft } from "./useYakuWorkspaceForms";
import { useYakuWorkspaceResourceMutations } from "./useYakuWorkspaceResourceMutations";
import { useYakuWorkspaceRunMutations } from "./useYakuWorkspaceRunMutations";
import type { YakuWorkspaceSearch } from "./types";

export function useYakuWorkspaceMutations({
  selectedWorkspaceId,
  selectedWorkspace,
  selectedEnvironmentId,
  selectedRequestId,
  selectedRunId,
  selectedFolderNode,
  selectedRequestNode,
  loadedRequest,
  workspaceName,
  environmentName,
  environmentVariablesText,
  cookieJarName,
  folderName,
  folderEditName,
  requestBuilderDraft,
  requestEditDraft,
  setSearch,
}: {
  selectedWorkspaceId: string | null | undefined;
  selectedWorkspace: YakuWorkspace | null | undefined;
  selectedEnvironmentId: string | null | undefined;
  selectedRequestId: string | null | undefined;
  selectedRunId: string | null | undefined;
  selectedFolderNode: YakuRequestNodePageItem | null | undefined;
  selectedRequestNode: (YakuRequestNodePageItem & { requestId: string }) | null | undefined;
  loadedRequest: YakuRequest | null | undefined;
  workspaceName: string;
  environmentName: string;
  environmentVariablesText: string;
  cookieJarName: string;
  folderName: string;
  folderEditName: string;
  requestBuilderDraft: RequestBuilderDraft;
  requestEditDraft: RequestEditDraft;
  setSearch: (patch: Partial<YakuWorkspaceSearch>) => void;
}) {
  const runMutations = useYakuWorkspaceRunMutations({
    selectedRequestId,
    selectedRunId,
    selectedEnvironmentId,
    setSearch,
  });
  const resourceMutations = useYakuWorkspaceResourceMutations({
    selectedWorkspaceId,
    selectedWorkspace,
    selectedEnvironmentId,
    selectedRequestId,
    selectedFolderNode,
    selectedRequestNode,
    loadedRequest,
    workspaceName,
    environmentName,
    environmentVariablesText,
    cookieJarName,
    folderName,
    folderEditName,
    requestBuilderDraft,
    requestEditDraft,
    setSearch,
  });

  return {
    ...runMutations,
    ...resourceMutations,
  };
}
