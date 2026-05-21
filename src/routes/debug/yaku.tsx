import { createFileRoute } from "@tanstack/react-router";
import { startTransition, useCallback } from "react";
import {
  YakuWorkspaceShell,
  cleanYakuWorkspaceSearch,
  validateYakuWorkspaceSearch,
  type YakuWorkspaceSearch,
} from "../../features/yaku-workspace";

export const Route = createFileRoute("/debug/yaku")({
  component: RouteComponent,
  validateSearch: validateYakuWorkspaceSearch,
});

function RouteComponent() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const setSearch = useCallback(
    (patch: Partial<YakuWorkspaceSearch>) => {
      startTransition(() => {
        navigate({
          to: "/debug/yaku",
          replace: true,
          search: (prev) => cleanYakuWorkspaceSearch({ ...prev, ...patch }),
        });
      });
    },
    [navigate],
  );

  return <YakuWorkspaceShell search={search} setSearch={setSearch} />;
}
