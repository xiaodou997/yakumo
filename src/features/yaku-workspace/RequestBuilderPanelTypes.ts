import type {
  YakuCookieJar,
  YakuRequestNodePageItem,
} from "../../lib/yaku-client";
import type { RequestBuilderDraft } from "./useYakuWorkspaceForms";

export type RequestBuilderPanelProps = {
  workspaceId: string | null | undefined;
  folderNodes: YakuRequestNodePageItem[];
  cookieJars: YakuCookieJar[];
  draft: RequestBuilderDraft;
  isCreatingFolder: boolean;
  isCreatingRequest: boolean;
  onCreateFolder: () => void;
  onCreateRequest: () => void;
};

export function requestBuilderFolderOptions(
  folderNodes: YakuRequestNodePageItem[],
) {
  return [
    { label: "Root", value: "__root__" },
    ...folderNodes.map((folder) => ({ label: folder.name, value: folder.id })),
  ];
}
