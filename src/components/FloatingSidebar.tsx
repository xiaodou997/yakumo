import classNames from "classnames";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { HeaderSize } from "./HeaderSize";
import { Overlay } from "./Overlay";
import { SidebarActions } from "./SidebarActions";

const Sidebar = lazy(() => import("./Sidebar"));

interface Props {
  open: boolean;
  onClose: () => void;
}

export function FloatingSidebar({ open, onClose }: Props) {
  return (
    <Overlay open={open} portalName="sidebar" onClose={onClose} zIndex={20}>
      <div
        className={classNames(
          "x-theme-sidebar",
          "absolute top-0 left-0 bottom-0 bg-surface border-r border-border-subtle w-[20rem]",
          "grid grid-rows-[auto_1fr]",
        )}
      >
        <HeaderSize hideControls size="lg" className="border-transparent flex items-center">
          <SidebarActions />
        </HeaderSize>
        <ErrorBoundary name="Sidebar (Floating)">
          <Suspense fallback={<SidebarFallback />}>
            <Sidebar />
          </Suspense>
        </ErrorBoundary>
      </div>
    </Overlay>
  );
}

function SidebarFallback({ className }: { className?: string }) {
  return <div className={classNames(className, "h-full w-full bg-surface")} />;
}
