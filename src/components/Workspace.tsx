import { workspacesAtom } from "@yakumo-internal/models";
import classNames from "classnames";
import { useAtomValue } from "jotai";
import type { CSSProperties } from "react";
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";
import {
  useEnsureActiveCookieJar,
  useSubscribeActiveCookieJarId,
} from "../hooks/useActiveCookieJar";
import {
  activeEnvironmentAtom,
  useSubscribeActiveEnvironmentId,
} from "../hooks/useActiveEnvironment";
import { useSubscribeActiveFolderId } from "../hooks/useActiveFolderId";
import { activeRequestAtom } from "../hooks/useActiveRequest";
import { useSubscribeActiveRequestId } from "../hooks/useActiveRequestId";
import { useFloatingSidebarHidden } from "../hooks/useFloatingSidebarHidden";
import { useHotKey } from "../hooks/useHotKey";
import { useSubscribeRecentCookieJars } from "../hooks/useRecentCookieJars";
import { useSubscribeRecentEnvironments } from "../hooks/useRecentEnvironments";
import { useSubscribeRecentRequests } from "../hooks/useRecentRequests";
import { useSubscribeRecentWorkspaces } from "../hooks/useRecentWorkspaces";
import { useShouldFloatSidebar } from "../hooks/useShouldFloatSidebar";
import { useSidebarHidden } from "../hooks/useSidebarHidden";
import { useSidebarWidth } from "../hooks/useSidebarWidth";
import { useSyncWorkspaceRequestTitle } from "../hooks/useSyncWorkspaceRequestTitle";
import { duplicateRequestOrFolderAndNavigate } from "../lib/duplicateRequestOrFolderAndNavigate";
import { jotaiStore } from "../lib/jotai";
import { ErrorBoundary } from "./ErrorBoundary";
import { HeaderSize } from "./HeaderSize";
import type { ResizeHandleEvent } from "./ResizeHandle";
import { ResizeHandle } from "./ResizeHandle";
import { WorkspaceBody } from "./WorkspaceBody";
import { WorkspaceHeader } from "./WorkspaceHeader";

const FloatingSidebar = lazy(() =>
  import("./FloatingSidebar").then((m) => ({ default: m.FloatingSidebar })),
);
const Sidebar = lazy(() => import("./Sidebar"));

const side = { gridArea: "side" };
const head = { gridArea: "head" };
const body = { gridArea: "body" };
const drag = { gridArea: "drag" };

export function Workspace() {
  // First, subscribe to some things applicable to workspaces
  useGlobalWorkspaceHooks();

  const workspaces = useAtomValue(workspacesAtom);
  const [width, setWidth, resetWidth] = useSidebarWidth();
  const [sidebarHidden, setSidebarHidden] = useSidebarHidden();
  const [floatingSidebarHidden, setFloatingSidebarHidden] = useFloatingSidebarHidden();
  const activeEnvironment = useAtomValue(activeEnvironmentAtom);
  const floating = useShouldFloatSidebar();
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const startWidth = useRef<number | null>(null);

  const handleResizeMove = useCallback(
    async ({ x, xStart }: ResizeHandleEvent) => {
      if (width == null || startWidth.current == null) return;

      const newWidth = startWidth.current + (x - xStart);
      if (newWidth < 50) {
        if (!sidebarHidden) await setSidebarHidden(true);
        resetWidth();
      } else {
        if (sidebarHidden) await setSidebarHidden(false);
        setWidth(newWidth);
      }
    },
    [width, sidebarHidden, setSidebarHidden, resetWidth, setWidth],
  );

  const handleResizeStart = useCallback(() => {
    startWidth.current = width ?? null;
    setIsResizing(true);
  }, [width]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    startWidth.current = null;
  }, []);

  const sideWidth = sidebarHidden ? 0 : width;
  const styles = useMemo<CSSProperties>(
    () => ({
      gridTemplate: floating
        ? `
        ' ${head.gridArea}' auto
        ' ${body.gridArea}' minmax(0,1fr)
        / 1fr`
        : `
        ' ${head.gridArea} ${head.gridArea} ${head.gridArea}' auto
        ' ${side.gridArea} ${drag.gridArea} ${body.gridArea}' minmax(0,1fr)
        / ${sideWidth}px   0                1fr`,
    }),
    [sideWidth, floating],
  );

  const environmentBgStyle = useMemo(() => {
    if (activeEnvironment?.color == null) return undefined;
    const background = `linear-gradient(to right, ${activeEnvironment.color} 15%, transparent 40%)`;
    return { background };
  }, [activeEnvironment?.color]);

  // We're loading still
  if (workspaces.length === 0) {
    return null;
  }

  return (
    <div
      style={styles}
      className={classNames(
        "grid w-full h-full",
        // Animate sidebar width changes but only when not resizing
        // because it's too slow to animate on mouse move
        !isResizing && "transition-grid",
      )}
    >
      {floating ? (
        <Suspense fallback={null}>
          <FloatingSidebar
            open={!floatingSidebarHidden}
            onClose={() => setFloatingSidebarHidden(true)}
          />
        </Suspense>
      ) : (
        <>
          <div style={side} className={classNames("x-theme-sidebar", "overflow-hidden bg-surface")}>
            <ErrorBoundary name="Sidebar">
              <Suspense fallback={<SidebarFallback className="border-r border-border-subtle" />}>
                <Sidebar className="border-r border-border-subtle" />
              </Suspense>
            </ErrorBoundary>
          </div>
          <ResizeHandle
            style={drag}
            className="-translate-x-[1px]"
            justify="end"
            side="right"
            onResizeStart={handleResizeStart}
            onResizeEnd={handleResizeEnd}
            onResizeMove={handleResizeMove}
            onReset={resetWidth}
          />
        </>
      )}
      <HeaderSize
        data-tauri-drag-region
        size="lg"
        className="relative x-theme-appHeader bg-surface"
        style={head}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div // Add subtle background
            style={environmentBgStyle}
            className="absolute inset-0 opacity-[0.07]"
          />
          <div // Add a subtle border bottom
            style={environmentBgStyle}
            className="absolute left-0 right-0 -bottom-[1px] h-[1px] opacity-20"
          />
        </div>
        <WorkspaceHeader className="pointer-events-none" />
      </HeaderSize>
      <ErrorBoundary name="Workspace Body">
        <WorkspaceBody />
      </ErrorBoundary>
    </div>
  );
}

function SidebarFallback({ className }: { className?: string }) {
  return <div className={classNames(className, "h-full w-full bg-surface")} />;
}

function useGlobalWorkspaceHooks() {
  useEnsureActiveCookieJar();

  useSubscribeActiveRequestId();
  useSubscribeActiveFolderId();
  useSubscribeActiveEnvironmentId();
  useSubscribeActiveCookieJarId();

  useSubscribeRecentRequests();
  useSubscribeRecentWorkspaces();
  useSubscribeRecentEnvironments();
  useSubscribeRecentCookieJars();

  useSyncWorkspaceRequestTitle();

  useHotKey("model.duplicate", () =>
    duplicateRequestOrFolderAndNavigate(jotaiStore.get(activeRequestAtom)),
  );
}
