import { Button } from "../../components/core/Button";
import { Select } from "../../components/core/Select";
import { VStack } from "../../components/core/Stacks";
import type { YakuCookieJar, YakuProtocol } from "../../lib/yaku-client";
import { fieldClassName } from "./RequestFieldPrimitives";
import { RequestStructuredEditor } from "./RequestEditor";
import type { RequestBuilderDraft } from "./useYakuWorkspaceForms";
import { FieldLabel } from "./WorkspacePanels";

export function RequestBuilderRequestCard({
  workspaceId,
  draft,
  cookieJars,
  isCreatingRequest,
  onCreateRequest,
}: {
  workspaceId: string | null | undefined;
  draft: RequestBuilderDraft;
  cookieJars: YakuCookieJar[];
  isCreatingRequest: boolean;
  onCreateRequest: () => void;
}) {
  return (
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
        <Button
          size="xs"
          type="submit"
          disabled={workspaceId == null}
          isLoading={isCreatingRequest}
        >
          Create Request
        </Button>
      </VStack>
    </form>
  );
}
