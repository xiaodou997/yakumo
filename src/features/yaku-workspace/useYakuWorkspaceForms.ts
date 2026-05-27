import type {
  YakuEnvironment,
  YakuRequest,
  YakuRequestNodePageItem,
} from "../../lib/yaku-client";
import { useYakuWorkspaceMetaForms } from "./useYakuWorkspaceMetaForms";
import {
  useYakuWorkspaceRequestForms,
  type RequestBuilderDraft,
  type RequestEditDraft,
} from "./useYakuWorkspaceRequestForms";

export type { RequestBuilderDraft, RequestEditDraft } from "./useYakuWorkspaceRequestForms";

export function useYakuWorkspaceForms({
  selectedEnvironment,
  selectedFolderNode,
  selectedRequestNode,
  loadedRequest,
}: {
  selectedEnvironment: YakuEnvironment | null | undefined;
  selectedFolderNode: YakuRequestNodePageItem | null | undefined;
  selectedRequestNode:
    | (YakuRequestNodePageItem & { requestId: string })
    | null
    | undefined;
  loadedRequest: YakuRequest | null | undefined;
}) {
  const metaForms = useYakuWorkspaceMetaForms({
    selectedEnvironment,
    selectedFolderNode,
  });
  const requestForms = useYakuWorkspaceRequestForms({
    selectedRequestNode,
    loadedRequest,
  });

  const requestBuilderDraft: RequestBuilderDraft = {
    ...requestForms.requestBuilderDraft,
    folderName: metaForms.folderName,
    setFolderName: metaForms.setFolderName,
  };
  const requestEditDraft: RequestEditDraft = requestForms.requestEditDraft;

  return {
    ...metaForms,
    ...requestForms,
    requestBuilderDraft,
    requestEditDraft,
  };
}
