import type {
  Folder,
  GrpcRequest,
  HttpRequest,
  WebsocketRequest,
  Workspace,
} from "@yakumo-internal/models";
import { useAtomValue } from "jotai";
import { lazy, Suspense } from "react";
import { activeFolderAtom } from "../hooks/useActiveFolder";
import { activeRequestAtom } from "../hooks/useActiveRequest";
import { activeWorkspaceAtom } from "../hooks/useActiveWorkspace";
import { importData } from "../lib/importData";
import { Banner } from "./core/Banner";
import { Button } from "./core/Button";
import { HotkeyList } from "./core/HotkeyList";
import { FeedbackLink } from "./core/Link";
import { HStack } from "./core/Stacks";

const CreateDropdown = lazy(() =>
  import("./CreateDropdown").then((m) => ({ default: m.CreateDropdown })),
);
const FolderLayout = lazy(() =>
  import("./FolderLayout").then((m) => ({ default: m.FolderLayout })),
);
const GrpcConnectionLayout = lazy(() =>
  import("./GrpcConnectionLayout").then((m) => ({ default: m.GrpcConnectionLayout })),
);
const HttpRequestLayout = lazy(() =>
  import("./HttpRequestLayout").then((m) => ({ default: m.HttpRequestLayout })),
);
const WebsocketRequestLayout = lazy(() =>
  import("./WebsocketRequestLayout").then((m) => ({ default: m.WebsocketRequestLayout })),
);

const body = { gridArea: "body" };

type ActiveRequest = GrpcRequest | HttpRequest | WebsocketRequest | null;

export function WorkspaceBody() {
  const activeRequest = useAtomValue(activeRequestAtom);
  const activeFolder = useAtomValue(activeFolderAtom);
  const activeWorkspace = useAtomValue(activeWorkspaceAtom);

  return (
    <WorkspaceBodyContent
      activeRequest={activeRequest}
      activeFolder={activeFolder}
      activeWorkspace={activeWorkspace}
    />
  );
}

export function WorkspaceBodyContent({
  activeRequest,
  activeFolder,
  activeWorkspace,
}: {
  activeRequest: ActiveRequest;
  activeFolder: Folder | null;
  activeWorkspace: Workspace | null;
}) {
  if (activeWorkspace == null) {
    return (
      <div className="m-auto">
        <Banner color="warning" className="max-w-[30rem]">
          The active workspace was not found. Select a workspace from the header menu or report this
          bug to <FeedbackLink />
        </Banner>
      </div>
    );
  }

  if (activeRequest?.model === "grpc_request") {
    return (
      <Suspense fallback={<WorkspaceBodyFallback />}>
        <GrpcConnectionLayout style={body} />
      </Suspense>
    );
  }
  if (activeRequest?.model === "websocket_request") {
    return (
      <Suspense fallback={<WorkspaceBodyFallback />}>
        <WebsocketRequestLayout style={body} activeRequest={activeRequest} />
      </Suspense>
    );
  }
  if (activeRequest?.model === "http_request") {
    return (
      <Suspense fallback={<WorkspaceBodyFallback />}>
        <HttpRequestLayout activeRequest={activeRequest} style={body} />
      </Suspense>
    );
  }
  if (activeFolder != null) {
    return (
      <Suspense fallback={<WorkspaceBodyFallback />}>
        <FolderLayout folder={activeFolder} style={body} />
      </Suspense>
    );
  }

  return (
    <HotkeyList
      hotkeys={["model.create", "sidebar.focus", "settings.show"]}
      bottomSlot={
        <HStack space={1} justifyContent="center" className="mt-3">
          <Button variant="border" size="sm" onClick={() => importData.mutate()}>
            Import
          </Button>
          <Suspense
            fallback={
              <Button disabled variant="border" forDropdown size="sm">
                New Request
              </Button>
            }
          >
            <CreateDropdown hideFolder>
              <Button variant="border" forDropdown size="sm">
                New Request
              </Button>
            </CreateDropdown>
          </Suspense>
        </HStack>
      }
    />
  );
}

function WorkspaceBodyFallback() {
  return <div style={body} className="bg-surface" />;
}
