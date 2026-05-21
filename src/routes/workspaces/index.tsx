import { createFileRoute } from "@tanstack/react-router";
import { startTransition, useCallback } from "react";
import {
  YakuWorkspaceShell,
  cleanYakuWorkspaceSearch,
  validateYakuWorkspaceSearch,
  type YakuWorkspaceSearch,
} from "../../features/yaku-workspace";

export const Route = createFileRoute("/workspaces/")({
  component: RouteComponent,
  validateSearch: validateYakuWorkspaceSearch,
});

function RouteComponent() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const setSearch = useCallback(
    (patch: Partial<YakuWorkspaceSearch>) => {
      startTransition(() => {
        const next = cleanYakuWorkspaceSearch({ ...search, ...patch });
        if (next.workspaceId != null) {
          const { workspaceId, ...rest } = next;
          navigate({
            to: "/workspaces/$workspaceId",
            params: { workspaceId },
            replace: true,
            search: rest,
          });
          return;
        }

        navigate({
          to: "/workspaces",
          replace: true,
          search: next,
        });
      });
    },
    [navigate, search],
  );

  return <YakuWorkspaceShell search={search} setSearch={setSearch} />;
}
