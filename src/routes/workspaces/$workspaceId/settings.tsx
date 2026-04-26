import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import type { SettingsTab } from "../../../components/Settings/Settings";

const Settings = lazy(() => import("../../../components/Settings/Settings"));

interface SettingsSearchSchema {
  tab?: SettingsTab;
}

export const Route = createFileRoute("/workspaces/$workspaceId/settings")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): SettingsSearchSchema => ({
    tab: (search.tab ?? "general") as SettingsTab,
  }),
});

function RouteComponent() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center">Loading...</div>}>
      <Settings />
    </Suspense>
  );
}
