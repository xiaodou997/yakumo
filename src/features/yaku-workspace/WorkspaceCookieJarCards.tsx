import { Button } from "../../components/core/Button";
import { HStack, VStack } from "../../components/core/Stacks";
import type { YakuCookieRecord } from "../../lib/yaku-client";
import { WorkspaceContextStatBlock } from "./WorkspaceContextShared";
import {
  describeCookieSameSite,
  formatCookieDate,
  normalizeCookieSameSite,
} from "./WorkspaceCookieJarModel";

export function CookieGroupCard({
  group,
  isDeletingCookie,
  deletingCookieId,
  onDeleteCookie,
  onFocusGroup,
  onDeleteGroup,
  batchDeleteScope,
}: {
  group: { domain: string; path: string; cookies: YakuCookieRecord[] };
  isDeletingCookie: boolean;
  deletingCookieId: string;
  onDeleteCookie: (cookie: YakuCookieRecord) => void;
  onFocusGroup: (domain: string, path: string) => void;
  onDeleteGroup: (group: { domain: string; path: string; cookies: YakuCookieRecord[] }) => void;
  batchDeleteScope: string;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-2 py-2">
      <HStack justifyContent="between" alignItems="start" className="gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-text">{group.domain}</div>
          <div className="truncate text-[11px] text-text-subtle">
            Path {group.path} · {group.cookies.length} cookie{group.cookies.length === 1 ? "" : "s"}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-text-subtlest">
            <span>{group.cookies.filter((cookie) => !cookie.secure).length} insecure</span>
            <span>{group.cookies.filter((cookie) => !cookie.httpOnly).length} JS readable</span>
            <span>{group.cookies.filter((cookie) => cookie.expiresAt == null).length} session</span>
            <span>
              {
                group.cookies.filter(
                  (cookie) => normalizeCookieSameSite(cookie.sameSite) === "__unset__",
                ).length
              }{" "}
              SameSite unset
            </span>
          </div>
        </div>
        <HStack space={1} className="shrink-0">
          <Button
            size="2xs"
            type="button"
            variant="border"
            onClick={() => onFocusGroup(group.domain, group.path)}
          >
            Focus
          </Button>
          <Button
            size="2xs"
            type="button"
            variant="border"
            color="danger"
            isLoading={batchDeleteScope === `${group.domain}@@${group.path}`}
            onClick={() => onDeleteGroup(group)}
          >
            Delete Group
          </Button>
        </HStack>
      </HStack>
      <VStack space={2} className="mt-2">
        {group.cookies.map((cookie) => (
          <div
            key={cookie.id}
            className="rounded-md border border-border-subtle bg-surface px-2 py-2"
          >
            <HStack justifyContent="between" alignItems="start" className="gap-2">
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-text">{cookie.name}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-text-subtlest">
                  <span>{describeCookieSameSite(cookie.sameSite)}</span>
                  <span>{cookie.httpOnly ? "HttpOnly" : "JS readable"}</span>
                  <span>{cookie.secure ? "Secure" : "Insecure"}</span>
                  <span>{cookie.expiresAt != null ? "Persistent" : "Session"}</span>
                </div>
                <div className="mt-1 text-[11px] text-text-subtle">
                  Expires {formatCookieDate(cookie.expiresAt)}
                </div>
                <div className="mt-1 text-[11px] text-text-subtlest">
                  Updated {formatCookieDate(cookie.updatedAt)}
                </div>
                <div className="mt-1 break-all text-[11px] text-text-subtle">Value: {cookie.value}</div>
              </div>
              <Button
                size="2xs"
                type="button"
                variant="border"
                color="danger"
                isLoading={isDeletingCookie && deletingCookieId === cookie.id}
                onClick={() => onDeleteCookie(cookie)}
              >
                Delete
              </Button>
            </HStack>
          </div>
        ))}
      </VStack>
    </div>
  );
}

export function CookieSummaryStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return <WorkspaceContextStatBlock label={label} value={value} />;
}
