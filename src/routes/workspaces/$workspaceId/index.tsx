import { createFileRoute } from "@tanstack/react-router";
import { startTransition, useCallback, useMemo } from "react";
import {
  YakuWorkspaceShell,
  cleanYakuWorkspaceSearch,
  validateYakuWorkspaceSearch,
  type YakuWorkspaceSearch,
} from "../../../features/yaku-workspace";

export const Route = createFileRoute("/workspaces/$workspaceId/")({
  component: RouteComponent,
  validateSearch: validateWorkspaceSearch,
});

function RouteComponent() {
  const { workspaceId } = Route.useParams();
  const routeSearch = Route.useSearch();
  const navigate = Route.useNavigate();
  const search = useMemo(
    () => cleanYakuWorkspaceSearch({ ...routeSearch, workspaceId }),
    [routeSearch, workspaceId],
  );

  const setSearch = useCallback(
    (patch: Partial<YakuWorkspaceSearch>) => {
      startTransition(() => {
        const next = cleanYakuWorkspaceSearch({ ...search, ...patch });
        const nextWorkspaceId = next.workspaceId ?? workspaceId;
        const { workspaceId: _workspaceId, ...rest } = next;

        navigate({
          to: "/workspaces/$workspaceId",
          params: { workspaceId: nextWorkspaceId },
          replace: true,
          search: rest,
        });
      });
    },
    [navigate, search, workspaceId],
  );

  return <YakuWorkspaceShell search={search} setSearch={setSearch} />;
}

function validateWorkspaceSearch(search: Record<string, unknown>): YakuWorkspaceSearch {
  const yakuSearch = validateYakuWorkspaceSearch(search);
  return cleanYakuWorkspaceSearch(yakuSearch);
}
