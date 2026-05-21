import { createFileRoute } from "@tanstack/react-router";
import { startTransition, useCallback, useMemo } from "react";
import {
  YakuWorkspaceShell,
  cleanYakuWorkspaceSearch,
  validateYakuWorkspaceSearch,
  type YakuWorkspaceSearch,
} from "../../../features/yaku-workspace";

type LegacyWorkspaceSearch = {
  environment_id?: string | null;
  cookie_jar_id?: string | null;
  request_id?: string | null;
  folder_id?: string | null;
};

type WorkspaceRouteSearch = YakuWorkspaceSearch & LegacyWorkspaceSearch;

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

function validateWorkspaceSearch(search: Record<string, unknown>): WorkspaceRouteSearch {
  const yakuSearch = validateYakuWorkspaceSearch(search);
  const legacySearch = {
    request_id: asOptionalString(search.request_id),
    folder_id: asOptionalString(search.folder_id),
    environment_id: asOptionalString(search.environment_id),
    cookie_jar_id: asOptionalString(search.cookie_jar_id),
  };

  return {
    ...legacySearch,
    ...cleanYakuWorkspaceSearch({
      ...yakuSearch,
      requestId: yakuSearch.requestId ?? legacySearch.request_id ?? undefined,
      folderId: yakuSearch.folderId ?? legacySearch.folder_id ?? undefined,
      environmentId: yakuSearch.environmentId ?? legacySearch.environment_id ?? undefined,
    }),
  };
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value !== "" ? value : undefined;
}
