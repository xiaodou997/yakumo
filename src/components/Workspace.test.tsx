import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { WorkspaceBodyContent } from "./WorkspaceBody";

const layoutMocks = vi.hoisted(() => ({
  folder: vi.fn(() => <div data-testid="folder-layout">Folder</div>),
  grpc: vi.fn(() => <div data-testid="grpc-layout">gRPC</div>),
  http: vi.fn(() => <div data-testid="http-layout">HTTP</div>),
  websocket: vi.fn(() => <div data-testid="websocket-layout">WebSocket</div>),
}));

vi.mock("./FolderLayout", () => ({
  FolderLayout: layoutMocks.folder,
}));

vi.mock("./GrpcConnectionLayout", () => ({
  GrpcConnectionLayout: layoutMocks.grpc,
}));

vi.mock("./HttpRequestLayout", () => ({
  HttpRequestLayout: layoutMocks.http,
}));

vi.mock("./WebsocketRequestLayout", () => ({
  WebsocketRequestLayout: layoutMocks.websocket,
}));

vi.mock("../hooks/useActiveFolder", async () => {
  const { atom } = await import("jotai");
  return { activeFolderAtom: atom(null) };
});

vi.mock("../hooks/useActiveRequest", async () => {
  const { atom } = await import("jotai");
  return { activeRequestAtom: atom(null) };
});

vi.mock("../hooks/useActiveWorkspace", async () => {
  const { atom } = await import("jotai");
  return { activeWorkspaceAtom: atom(null) };
});

vi.mock("../lib/importData", () => ({
  importData: { mutate: vi.fn() },
}));

vi.mock("./CreateDropdown", () => ({
  CreateDropdown: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@tauri-apps/plugin-os", () => ({
  type: () => "macos",
}));

function renderWorkspaceBody({
  activeRequest,
  activeFolder = null,
}: {
  activeRequest?: { id: string; model: string };
  activeFolder?: { id: string; model: string } | null;
}) {
  return render(
    <Suspense>
      <WorkspaceBodyContent
        activeRequest={activeRequest as never}
        activeFolder={activeFolder as never}
        activeWorkspace={{ id: "workspace_1", model: "workspace", name: "Workspace" } as never}
      />
    </Suspense>,
  );
}

describe("WorkspaceBody", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("loads only the active HTTP request layout", async () => {
    renderWorkspaceBody({
      activeRequest: { id: "http_1", model: "http_request" },
    });

    expect(await screen.findByTestId("http-layout")).toBeTruthy();
    expect(layoutMocks.http).toHaveBeenCalledTimes(1);
    expect(layoutMocks.grpc).not.toHaveBeenCalled();
    expect(layoutMocks.websocket).not.toHaveBeenCalled();
    expect(layoutMocks.folder).not.toHaveBeenCalled();
  });

  test("switches to the selected protocol layout without rendering the others", async () => {
    const { rerender } = renderWorkspaceBody({
      activeRequest: { id: "grpc_1", model: "grpc_request" },
    });

    expect(await screen.findByTestId("grpc-layout")).toBeTruthy();
    expect(layoutMocks.grpc).toHaveBeenCalledTimes(1);
    expect(layoutMocks.http).not.toHaveBeenCalled();
    expect(layoutMocks.websocket).not.toHaveBeenCalled();

    rerender(
      <Suspense>
        <WorkspaceBodyContent
          activeRequest={{ id: "websocket_1", model: "websocket_request" } as never}
          activeFolder={null}
          activeWorkspace={{ id: "workspace_1", model: "workspace", name: "Workspace" } as never}
        />
      </Suspense>,
    );

    expect(await screen.findByTestId("websocket-layout")).toBeTruthy();
    await waitFor(() => expect(layoutMocks.websocket).toHaveBeenCalledTimes(1));
    expect(layoutMocks.http).not.toHaveBeenCalled();
  });
});
