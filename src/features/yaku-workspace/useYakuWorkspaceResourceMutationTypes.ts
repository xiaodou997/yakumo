import type {
  YakuRequest,
  YakuRequestNodePageItem,
  YakuWorkspace,
} from "../../lib/yaku-client";
import type { RequestBuilderDraft, RequestEditDraft } from "./useYakuWorkspaceForms";
import type { YakuWorkspaceSearch } from "./types";

export type YakuWorkspaceSearchSetter = (patch: Partial<YakuWorkspaceSearch>) => void;

export type YakuWorkspaceResourceMutationParams = {
  selectedWorkspaceId: string | null | undefined;
  selectedWorkspace: YakuWorkspace | null | undefined;
  selectedEnvironmentId: string | null | undefined;
  selectedRequestId: string | null | undefined;
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
  setSearch: YakuWorkspaceSearchSetter;
};
