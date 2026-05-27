import { VStack } from "../../components/core/Stacks";
import type { YakuCookieRecord } from "../../lib/yaku-client";
import { CookieGroupCard } from "./WorkspaceCookieJarCards";

type CookieGroup = {
  domain: string;
  path: string;
  cookies: YakuCookieRecord[];
};

export function WorkspaceCookieJarResults({
  cookies,
  filteredCookies,
  groupedCookies,
  isDeletingCookie,
  deletingCookieId,
  batchDeleteScope,
  onDeleteCookie,
  onFocusGroup,
  onDeleteGroup,
}: {
  cookies: YakuCookieRecord[];
  filteredCookies: YakuCookieRecord[];
  groupedCookies: CookieGroup[];
  isDeletingCookie: boolean;
  deletingCookieId: string;
  batchDeleteScope: string;
  onDeleteCookie: (cookie: YakuCookieRecord) => void;
  onFocusGroup: (domain: string, path: string) => void;
  onDeleteGroup: (group: CookieGroup) => void;
}) {
  if (cookies.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface px-2 py-3 text-xs text-text-subtle">
        No stored cookies.
      </div>
    );
  }

  if (filteredCookies.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface px-2 py-3 text-xs text-text-subtle">
        No cookies match the current filters.
      </div>
    );
  }

  return (
    <div className="max-h-64 overflow-auto rounded-lg border border-border-subtle bg-surface px-2 py-2">
      <VStack space={2}>
        {groupedCookies.map((group) => (
          <CookieGroupCard
            key={`${group.domain}|${group.path}`}
            group={group}
            isDeletingCookie={isDeletingCookie}
            deletingCookieId={deletingCookieId}
            batchDeleteScope={batchDeleteScope}
            onDeleteCookie={onDeleteCookie}
            onFocusGroup={onFocusGroup}
            onDeleteGroup={onDeleteGroup}
          />
        ))}
      </VStack>
    </div>
  );
}
