import { VStack } from "../../components/core/Stacks";
import { RequestBuilderFolderCard } from "./RequestBuilderFolderCard";
import { RequestBuilderParentSelector } from "./RequestBuilderParentSelector";
import { RequestBuilderRequestCard } from "./RequestBuilderRequestCard";
import {
  requestBuilderFolderOptions,
  type RequestBuilderPanelProps,
} from "./RequestBuilderPanelTypes";
import { WorkspacePanel } from "./WorkspacePanels";

export function RequestBuilderPanel({
  workspaceId,
  folderNodes,
  cookieJars,
  draft,
  isCreatingFolder,
  isCreatingRequest,
  onCreateFolder,
  onCreateRequest,
}: RequestBuilderPanelProps) {
  return (
    <WorkspacePanel title="Request Builder" subtitle="Create folders and seed sendable Yaku requests.">
      <VStack space={3}>
        <RequestBuilderParentSelector
          parentId={draft.parentId}
          options={requestBuilderFolderOptions(folderNodes)}
          setParentId={draft.setParentId}
        />
        <RequestBuilderFolderCard
          workspaceId={workspaceId}
          folderName={draft.folderName}
          setFolderName={draft.setFolderName}
          isCreatingFolder={isCreatingFolder}
          onCreateFolder={onCreateFolder}
        />
        <RequestBuilderRequestCard
          workspaceId={workspaceId}
          draft={draft}
          cookieJars={cookieJars}
          isCreatingRequest={isCreatingRequest}
          onCreateRequest={onCreateRequest}
        />
      </VStack>
    </WorkspacePanel>
  );
}
