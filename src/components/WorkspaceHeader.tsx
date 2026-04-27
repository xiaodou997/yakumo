import classNames from "classnames";
import { useAtom, useAtomValue } from "jotai";
import { lazy, memo, Suspense, useCallback } from "react";
import { activeWorkspaceAtom, activeWorkspaceMetaAtom } from "../hooks/useActiveWorkspace";
import { useToggleCommandPalette } from "../hooks/useToggleCommandPalette";
import { workspaceLayoutAtom } from "../lib/atoms";
import { Icon } from "./core/Icon";
import { IconButton } from "./core/IconButton";
import { PillButton } from "./core/PillButton";
import { HStack } from "./core/Stacks";
import { SidebarActions } from "./SidebarActions";

const CookieDropdown = lazy(() =>
  import("./CookieDropdown").then((m) => ({ default: m.CookieDropdown })),
);
const EnvironmentActionsDropdown = lazy(() =>
  import("./EnvironmentActionsDropdown").then((m) => ({ default: m.EnvironmentActionsDropdown })),
);
const ImportCurlButton = lazy(() =>
  import("./ImportCurlButton").then((m) => ({ default: m.ImportCurlButton })),
);
const LicenseBadge = lazy(() =>
  import("./LicenseBadge").then((m) => ({ default: m.LicenseBadge })),
);
const RecentRequestsDropdown = lazy(() =>
  import("./RecentRequestsDropdown").then((m) => ({ default: m.RecentRequestsDropdown })),
);
const SettingsDropdown = lazy(() =>
  import("./SettingsDropdown").then((m) => ({ default: m.SettingsDropdown })),
);
const WorkspaceActionsDropdown = lazy(() =>
  import("./WorkspaceActionsDropdown").then((m) => ({ default: m.WorkspaceActionsDropdown })),
);

interface Props {
  className?: string;
}

export const WorkspaceHeader = memo(function WorkspaceHeader({ className }: Props) {
  const togglePalette = useToggleCommandPalette();
  const [workspaceLayout, setWorkspaceLayout] = useAtom(workspaceLayoutAtom);
  const workspace = useAtomValue(activeWorkspaceAtom);
  const workspaceMeta = useAtomValue(activeWorkspaceMetaAtom);
  const setupEncryption = useCallback(async () => {
    const { setupOrConfigureEncryption } = await import("../lib/setupOrConfigureEncryption");
    setupOrConfigureEncryption();
  }, []);
  const showEncryptionSetup =
    workspace != null &&
    workspaceMeta != null &&
    workspace.encryptionKeyChallenge != null &&
    workspaceMeta.encryptionKey == null;

  return (
    <div
      className={classNames(
        className,
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center w-full h-full",
      )}
    >
      <HStack space={0.5} className={classNames("flex-1 pointer-events-none")}>
        <SidebarActions />
        <Suspense fallback={<HeaderIconPlaceholder />}>
          <CookieDropdown />
        </Suspense>
        <HStack className="min-w-0">
          <Suspense fallback={<HeaderTextPlaceholder className="w-28" />}>
            <WorkspaceActionsDropdown />
          </Suspense>
          <Icon icon="chevron_right" color="secondary" />
          <Suspense fallback={<HeaderTextPlaceholder className="w-32" />}>
            <EnvironmentActionsDropdown className="w-auto pointer-events-auto" />
          </Suspense>
        </HStack>
      </HStack>
      <div className="pointer-events-none w-full max-w-[30vw] mx-auto flex justify-center">
        <Suspense fallback={null}>
          <RecentRequestsDropdown />
        </Suspense>
      </div>
      <div className="flex-1 flex gap-1 items-center h-full justify-end pointer-events-none pr-1">
        <Suspense fallback={null}>
          <ImportCurlButton />
        </Suspense>
        {showEncryptionSetup ? (
          <PillButton color="danger" onClick={setupEncryption}>
            Enter Encryption Key
          </PillButton>
        ) : (
          <Suspense fallback={null}>
            <LicenseBadge />
          </Suspense>
        )}
        <IconButton
          icon={
            workspaceLayout === "responsive"
              ? "magic_wand"
              : workspaceLayout === "horizontal"
                ? "columns_2"
                : "rows_2"
          }
          title={`Change to ${workspaceLayout === "horizontal" ? "vertical" : "horizontal"} layout`}
          size="sm"
          iconColor="secondary"
          onClick={() =>
            setWorkspaceLayout((prev) => (prev === "horizontal" ? "vertical" : "horizontal"))
          }
        />
        <IconButton
          icon="search"
          title="Search or execute a command"
          size="sm"
          hotkeyAction="command_palette.toggle"
          iconColor="secondary"
          onClick={togglePalette}
        />
        <Suspense fallback={<HeaderIconPlaceholder />}>
          <SettingsDropdown />
        </Suspense>
      </div>
    </div>
  );
});

function HeaderIconPlaceholder() {
  return <div className="h-sm w-sm flex-shrink-0 pointer-events-none" />;
}

function HeaderTextPlaceholder({ className }: { className: string }) {
  return <div className={classNames("h-sm flex-shrink-0 pointer-events-none", className)} />;
}
