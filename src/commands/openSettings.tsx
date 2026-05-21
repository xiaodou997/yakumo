import type { SettingsTab } from "../components/Settings/Settings";
import { createFastMutation } from "../hooks/useFastMutation";
import { router } from "../lib/router";
import { invokeCmd } from "../lib/tauri";
import { listYakuWorkspaces } from "../lib/yaku-client";

// Allow tab with an optional subtab suffix for future settings sections.
type SettingsTabWithSubtab = SettingsTab | `${SettingsTab}:${string}` | null;

export const openSettings = createFastMutation<void, string, SettingsTabWithSubtab>({
  mutationKey: ["open_settings"],
  mutationFn: async (tab) => {
    const workspaceId = await getActiveYakuWorkspaceId();
    if (workspaceId == null) return;

    const location = router.buildLocation({
      to: "/workspaces/$workspaceId/settings",
      params: { workspaceId },
      search: { tab: (tab ?? undefined) as SettingsTab | undefined },
    });

    await invokeCmd("cmd_new_child_window", {
      url: location.href,
      label: "settings",
      title: "Yakumo API Settings",
      innerSize: [750, 600],
    });
  },
});

async function getActiveYakuWorkspaceId() {
  const location = router.state.location;
  const pathMatch = location.pathname.match(/^\/workspaces\/([^/]+)/);
  const pathWorkspaceId = pathMatch?.[1] ? decodeURIComponent(pathMatch[1]) : null;
  if (pathWorkspaceId != null && pathWorkspaceId !== "settings") {
    return pathWorkspaceId;
  }

  const search = location.search as Record<string, unknown>;
  if (typeof search.workspaceId === "string" && search.workspaceId !== "") {
    return search.workspaceId;
  }

  const workspaces = await listYakuWorkspaces(1);
  return workspaces.items[0]?.id ?? null;
}
