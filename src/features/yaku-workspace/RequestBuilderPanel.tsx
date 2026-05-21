import { Button } from "../../components/core/Button";
import { Select } from "../../components/core/Select";
import { VStack } from "../../components/core/Stacks";
import type { YakuProtocol, YakuRequestNodePageItem } from "../../lib/yaku-client";
import { fieldClassName } from "./RequestFieldPrimitives";
import { RequestStructuredEditor } from "./RequestEditor";
import type { ConfigPair } from "./types";
import { FieldLabel, WorkspacePanel } from "./WorkspacePanels";

export function RequestBuilderPanel({
  workspaceId,
  folderNodes,
  parentId,
  setParentId,
  folderName,
  setFolderName,
  requestName,
  setRequestName,
  requestProtocol,
  setRequestProtocol,
  requestUrl,
  setRequestUrl,
  requestHttpMethod,
  setRequestHttpMethod,
  requestHttpBody,
  setRequestHttpBody,
  requestHeaders,
  setRequestHeaders,
  requestQueryParams,
  setRequestQueryParams,
  requestFollowRedirects,
  setRequestFollowRedirects,
  requestTimeoutMs,
  setRequestTimeoutMs,
  requestGrpcService,
  setRequestGrpcService,
  requestGrpcMethod,
  setRequestGrpcMethod,
  requestGrpcMessage,
  setRequestGrpcMessage,
  requestGrpcMetadata,
  setRequestGrpcMetadata,
  requestGrpcUseReflection,
  setRequestGrpcUseReflection,
  requestWebSocketMessages,
  setRequestWebSocketMessages,
  requestWebSocketMaxMessages,
  setRequestWebSocketMaxMessages,
  isCreatingFolder,
  isCreatingRequest,
  onCreateFolder,
  onCreateRequest,
}: {
  workspaceId: string | null | undefined;
  folderNodes: YakuRequestNodePageItem[];
  parentId: string;
  setParentId: (value: string) => void;
  folderName: string;
  setFolderName: (value: string) => void;
  requestName: string;
  setRequestName: (value: string) => void;
  requestProtocol: YakuProtocol;
  setRequestProtocol: (value: YakuProtocol) => void;
  requestUrl: string;
  setRequestUrl: (value: string) => void;
  requestHttpMethod: string;
  setRequestHttpMethod: (value: string) => void;
  requestHttpBody: string;
  setRequestHttpBody: (value: string) => void;
  requestHeaders: ConfigPair[];
  setRequestHeaders: (pairs: ConfigPair[]) => void;
  requestQueryParams: ConfigPair[];
  setRequestQueryParams: (pairs: ConfigPair[]) => void;
  requestFollowRedirects: boolean;
  setRequestFollowRedirects: (value: boolean) => void;
  requestTimeoutMs: string;
  setRequestTimeoutMs: (value: string) => void;
  requestGrpcService: string;
  setRequestGrpcService: (value: string) => void;
  requestGrpcMethod: string;
  setRequestGrpcMethod: (value: string) => void;
  requestGrpcMessage: string;
  setRequestGrpcMessage: (value: string) => void;
  requestGrpcMetadata: ConfigPair[];
  setRequestGrpcMetadata: (pairs: ConfigPair[]) => void;
  requestGrpcUseReflection: boolean;
  setRequestGrpcUseReflection: (value: boolean) => void;
  requestWebSocketMessages: string;
  setRequestWebSocketMessages: (value: string) => void;
  requestWebSocketMaxMessages: string;
  setRequestWebSocketMaxMessages: (value: string) => void;
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
          value={parentId}
          options={[
            { label: "Root", value: "__root__" },
            ...folderNodes.map((folder) => ({ label: folder.name, value: folder.id })),
          ]}
          onChange={setParentId}
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
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
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
              value={requestName}
              onChange={(event) => setRequestName(event.target.value)}
              className={fieldClassName}
            />
            <Select
              name="yaku-request-protocol"
              label="Protocol"
              value={requestProtocol}
              options={[
                { label: "HTTP", value: "http" },
                { label: "GraphQL", value: "graphql" },
                { label: "SSE", value: "sse" },
                { label: "WebSocket", value: "web_socket" },
                { label: "gRPC", value: "grpc" },
              ]}
              onChange={(value) => setRequestProtocol(value as YakuProtocol)}
              size="sm"
            />
            <RequestStructuredEditor
              protocol={requestProtocol}
              url={requestUrl}
              setUrl={setRequestUrl}
              httpMethod={requestHttpMethod}
              setHttpMethod={setRequestHttpMethod}
              httpBody={requestHttpBody}
              setHttpBody={setRequestHttpBody}
              headers={requestHeaders}
              setHeaders={setRequestHeaders}
              query={requestQueryParams}
              setQuery={setRequestQueryParams}
              followRedirects={requestFollowRedirects}
              setFollowRedirects={setRequestFollowRedirects}
              timeoutMs={requestTimeoutMs}
              setTimeoutMs={setRequestTimeoutMs}
              grpcService={requestGrpcService}
              setGrpcService={setRequestGrpcService}
              grpcMethod={requestGrpcMethod}
              setGrpcMethod={setRequestGrpcMethod}
              grpcMessage={requestGrpcMessage}
              setGrpcMessage={setRequestGrpcMessage}
              grpcMetadata={requestGrpcMetadata}
              setGrpcMetadata={setRequestGrpcMetadata}
              grpcUseReflection={requestGrpcUseReflection}
              setGrpcUseReflection={setRequestGrpcUseReflection}
              webSocketMessages={requestWebSocketMessages}
              setWebSocketMessages={setRequestWebSocketMessages}
              webSocketMaxMessages={requestWebSocketMaxMessages}
              setWebSocketMaxMessages={setRequestWebSocketMaxMessages}
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
