import { Button } from "../../components/core/Button";
import { Select } from "../../components/core/Select";
import { VStack } from "../../components/core/Stacks";
import type { YakuCookieJar, YakuProtocol, YakuRequestNodePageItem } from "../../lib/yaku-client";
import { fieldClassName } from "./RequestFieldPrimitives";
import { RequestStructuredEditor } from "./RequestEditor";
import type { RequestBuilderDraft } from "./useYakuWorkspaceForms";
import { FieldLabel, WorkspacePanel } from "./WorkspacePanels";

export function RequestBuilderPanel({
  workspaceId,
  folderNodes,
  cookieJars,
  draft,
  isCreatingFolder,
  isCreatingRequest,
  onCreateFolder,
  onCreateRequest,
}: {
  workspaceId: string | null | undefined;
  folderNodes: YakuRequestNodePageItem[];
  cookieJars: YakuCookieJar[];
  draft: RequestBuilderDraft;
  isCreatingFolder: boolean;
  isCreatingRequest: boolean;
  onCreateFolder: () => void;
  onCreateRequest: () => void;
}) {
  return (
    <WorkspacePanel title="Request Builder" subtitle="Create folders and seed sendable Yaku requests.">
      <VStack space={3}>
        <Select
          name="yaku-request-parent"
          label="Parent Folder"
          value={draft.parentId}
          options={[
            { label: "Root", value: "__root__" },
            ...folderNodes.map((folder) => ({ label: folder.name, value: folder.id })),
          ]}
          onChange={draft.setParentId}
        />
        <form
          className="rounded-xl border border-border-subtle bg-surface p-3"
          onSubmit={(event) => {
            event.preventDefault();
            onCreateFolder();
          }}
        >
          <VStack space={2}>
            <FieldLabel htmlFor="yaku-folder-name">New Folder</FieldLabel>
            <input
              id="yaku-folder-name"
              value={draft.folderName}
              onChange={(event) => draft.setFolderName(event.target.value)}
              className={fieldClassName}
            />
            <Button size="xs" type="submit" disabled={workspaceId == null} isLoading={isCreatingFolder}>
              Create Folder
            </Button>
          </VStack>
        </form>
        <form
          className="rounded-xl border border-border-subtle bg-surface p-3"
          onSubmit={(event) => {
            event.preventDefault();
            onCreateRequest();
          }}
        >
          <VStack space={2}>
            <FieldLabel htmlFor="yaku-request-name">New Request</FieldLabel>
            <input
              id="yaku-request-name"
              value={draft.requestName}
              onChange={(event) => draft.setRequestName(event.target.value)}
              className={fieldClassName}
            />
            <Select
              name="yaku-request-protocol"
              label="Protocol"
              value={draft.requestProtocol}
              options={[
                { label: "HTTP", value: "http" },
                { label: "GraphQL", value: "graphql" },
                { label: "SSE", value: "sse" },
                { label: "WebSocket", value: "web_socket" },
                { label: "gRPC", value: "grpc" },
              ]}
              onChange={(value) => draft.setRequestProtocol(value as YakuProtocol)}
              size="sm"
            />
            <RequestStructuredEditor
              protocol={draft.requestProtocol}
              draft={draft.config}
              cookieJars={cookieJars}
            />
            <Button size="xs" type="submit" disabled={workspaceId == null} isLoading={isCreatingRequest}>
              Create Request
            </Button>
          </VStack>
        </form>
      </VStack>
    </WorkspacePanel>
  );
}
