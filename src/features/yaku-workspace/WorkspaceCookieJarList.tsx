import type { ReactNode } from "react";
import { InlineCode } from "../../components/core/InlineCode";
import { VStack } from "../../components/core/Stacks";
import { showConfirmDelete } from "../../lib/confirm";
import type { YakuCookieRecord } from "../../lib/yaku-client";
import { WorkspaceCookieJarActions } from "./WorkspaceCookieJarActions";
import { WorkspaceCookieJarFilters } from "./WorkspaceCookieJarFilters";
import { WorkspaceCookieJarInsights } from "./WorkspaceCookieJarInsights";
import { WorkspaceCookieJarResults } from "./WorkspaceCookieJarResults";
import { useWorkspaceCookieJarListState } from "./useWorkspaceCookieJarListState";

export function WorkspaceCookieJarList({
  jarId,
  cookies,
  isLoading,
  isDeletingCookie,
  deletingCookieId,
  error,
  onDeleteCookie,
}: {
  jarId: string;
  cookies: YakuCookieRecord[];
  isLoading: boolean;
  isDeletingCookie: boolean;
  deletingCookieId: string;
  error: unknown;
  onDeleteCookie: (jarId: string, cookieId: string) => Promise<unknown>;
}) {
  const state = useWorkspaceCookieJarListState(cookies);

  const handleDeleteCookie = async (cookie: YakuCookieRecord) => {
    const confirmed = await showConfirmDelete({
      id: "confirm-delete-yaku-cookie",
      title: "Delete Cookie",
      description: (
        <>
          Delete cookie <InlineCode>{cookie.name}</InlineCode> for{" "}
          <InlineCode>
            {cookie.domain}
            {cookie.path}
          </InlineCode>
          .
        </>
      ),
    });

    if (!confirmed) {
      return;
    }

    onDeleteCookie(jarId, cookie.id);
  };

  const handleDeleteCookieBatch = async ({
    title,
    confirmId,
    cookiesToDelete,
    scopeKey,
    description,
  }: {
    title: string;
    confirmId: string;
    cookiesToDelete: YakuCookieRecord[];
    scopeKey: string;
    description: ReactNode;
  }) => {
    if (cookiesToDelete.length === 0) {
      return;
    }

    const confirmed = await showConfirmDelete({
      id: confirmId,
      title,
      description,
    });

    if (!confirmed) {
      return;
    }

    state.setBatchDeleteScope(scopeKey);
    state.setBatchDeleteFeedback("");
    let deletedCount = 0;

    try {
      for (const cookie of cookiesToDelete) {
        await onDeleteCookie(jarId, cookie.id);
        deletedCount += 1;
      }
      state.setBatchDeleteFeedback(
        `Deleted ${deletedCount} cookie${deletedCount === 1 ? "" : "s"} from ${scopeKey}.`,
      );
    } catch (deleteError) {
      state.setBatchDeleteFeedback(
        `Stopped after deleting ${deletedCount} cookie${deletedCount === 1 ? "" : "s"} from ${scopeKey}. ${String(deleteError)}`,
      );
    } finally {
      state.setBatchDeleteScope("");
    }
  };

  if (error != null) {
    return <div className="mt-2 text-xs text-danger">{String(error)}</div>;
  }
  if (isLoading && cookies.length === 0) {
    return <div className="mt-2 text-xs text-text-subtle">Loading cookies...</div>;
  }
  return (
    <VStack space={2} className="mt-2">
      <WorkspaceCookieJarFilters
        jarId={jarId}
        domainFilter={state.domainFilter}
        setDomainFilter={state.setDomainFilter}
        pathFilter={state.pathFilter}
        setPathFilter={state.setPathFilter}
        persistenceFilter={state.persistenceFilter}
        setPersistenceFilter={state.setPersistenceFilter}
        securityFilter={state.securityFilter}
        setSecurityFilter={state.setSecurityFilter}
        scriptabilityFilter={state.scriptabilityFilter}
        setScriptabilityFilter={state.setScriptabilityFilter}
        sameSiteFilter={state.sameSiteFilter}
        setSameSiteFilter={state.setSameSiteFilter}
        groupSort={state.groupSort}
        setGroupSort={state.setGroupSort}
        groupCount={state.groupedCookies.length}
        persistentCount={state.filteredCookies.filter((cookie) => cookie.expiresAt != null).length}
        secureCount={state.filteredCookies.filter((cookie) => cookie.secure).length}
      />
      <WorkspaceCookieJarInsights
        cookieRiskSummary={state.cookieRiskSummary}
        onFocusInsecure={() => {
          state.setSecurityFilter("insecure");
          state.clearFeedback();
        }}
        onFocusScriptReadable={() => {
          state.setScriptabilityFilter("script_readable");
          state.clearFeedback();
        }}
        onFocusSession={() => {
          state.setPersistenceFilter("session");
          state.clearFeedback();
        }}
        onFocusSameSiteUnset={() => {
          state.setSameSiteFilter("__unset__");
          state.clearFeedback();
        }}
        topCookieGroups={state.topCookieGroups}
        largestCookieGroup={state.largestCookieGroup}
        onFocusGroup={state.focusGroup}
      />
      <WorkspaceCookieJarActions
        jarId={jarId}
        filteredCount={state.filteredCookies.length}
        totalCount={cookies.length}
        hasCookieFilters={state.hasCookieFilters}
        filteredCookies={state.filteredCookies}
        batchDeleteScope={state.batchDeleteScope}
        batchDeleteFeedback={state.batchDeleteFeedback}
        onDeleteFiltered={() =>
          void handleDeleteCookieBatch({
            title: "Delete Filtered Cookies",
            confirmId: "confirm-delete-yaku-filtered-cookies",
            cookiesToDelete: state.filteredCookies,
            scopeKey: "filtered",
            description: (
              <>
                Delete <InlineCode>{String(state.filteredCookies.length)}</InlineCode> filtered cookies
                from jar <InlineCode>{jarId}</InlineCode>.
              </>
            ),
          })
        }
        onResetFilters={state.resetFilters}
      />
      <WorkspaceCookieJarResults
        cookies={cookies}
        filteredCookies={state.filteredCookies}
        groupedCookies={state.groupedCookies}
        isDeletingCookie={isDeletingCookie}
        deletingCookieId={deletingCookieId}
        batchDeleteScope={state.batchDeleteScope}
        onDeleteCookie={(cookie) => void handleDeleteCookie(cookie)}
        onFocusGroup={state.focusGroup}
        onDeleteGroup={(group) =>
          void handleDeleteCookieBatch({
            title: "Delete Cookie Group",
            confirmId: `confirm-delete-yaku-cookie-group-${group.domain}-${group.path}`,
            cookiesToDelete: group.cookies,
            scopeKey: `${group.domain}@@${group.path}`,
            description: (
              <>
                Delete <InlineCode>{String(group.cookies.length)}</InlineCode> cookies for{" "}
                <InlineCode>
                  {group.domain}
                  {group.path}
                </InlineCode>
                .
              </>
            ),
          })
        }
      />
    </VStack>
  );
}
