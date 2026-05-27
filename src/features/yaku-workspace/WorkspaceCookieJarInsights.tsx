import { Button } from "../../components/core/Button";
import { HStack } from "../../components/core/Stacks";
import { CookieSummaryStat } from "./WorkspaceCookieJarCards";
import type { YakuCookieRecord } from "../../lib/yaku-client";

type CookieGroup = {
  domain: string;
  path: string;
  cookies: YakuCookieRecord[];
};

export function WorkspaceCookieJarInsights({
  cookieRiskSummary,
  onFocusInsecure,
  onFocusScriptReadable,
  onFocusSession,
  onFocusSameSiteUnset,
  topCookieGroups,
  largestCookieGroup,
  onFocusGroup,
}: {
  cookieRiskSummary: {
    insecure: number;
    scriptReadable: number;
    session: number;
    sameSiteUnset: number;
  };
  onFocusInsecure: () => void;
  onFocusScriptReadable: () => void;
  onFocusSession: () => void;
  onFocusSameSiteUnset: () => void;
  topCookieGroups: CookieGroup[];
  largestCookieGroup: CookieGroup | null;
  onFocusGroup: (domain: string, path: string) => void;
}) {
  return (
    <>
      <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-2 py-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-text-subtlest">Risk Focus</div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <CookieRiskFocusButton
            title="Insecure"
            description={`${cookieRiskSummary.insecure} cookies`}
            onClick={onFocusInsecure}
          />
          <CookieRiskFocusButton
            title="JS Readable"
            description={`${cookieRiskSummary.scriptReadable} cookies`}
            onClick={onFocusScriptReadable}
          />
          <CookieRiskFocusButton
            title="Session"
            description={`${cookieRiskSummary.session} cookies`}
            onClick={onFocusSession}
          />
          <CookieRiskFocusButton
            title="SameSite Unset"
            description={`${cookieRiskSummary.sameSiteUnset} cookies`}
            onClick={onFocusSameSiteUnset}
          />
        </div>
      </div>
      {topCookieGroups.length > 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-2 py-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-text-subtlest">Top Groups</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {topCookieGroups.map((group) => (
              <button
                key={`cookie-group-nav-${group.domain}-${group.path}`}
                type="button"
                onClick={() => onFocusGroup(group.domain, group.path)}
                className="rounded-md border border-border-subtle bg-surface px-2 py-1 text-[10px] text-text-subtle hover:text-text"
              >
                <span className="font-medium">{group.cookies.length}</span>{" "}
                <span className="font-mono">
                  {group.domain}
                  {group.path}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {largestCookieGroup != null ? (
        <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-2 py-2">
          <HStack justifyContent="between" alignItems="start" className="gap-2">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.18em] text-text-subtlest">
                Largest Group
              </div>
              <div className="mt-1 truncate text-[11px] text-text">
                {largestCookieGroup.domain}
              </div>
              <div className="truncate text-[10px] text-text-subtlest">
                {largestCookieGroup.path} · {largestCookieGroup.cookies.length} cookies
              </div>
            </div>
            <Button
              size="2xs"
              type="button"
              variant="border"
              onClick={() => onFocusGroup(largestCookieGroup.domain, largestCookieGroup.path)}
            >
              Focus Group
            </Button>
          </HStack>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <CookieSummaryStat
              label="Persistent"
              value={String(
                largestCookieGroup.cookies.filter((cookie) => cookie.expiresAt != null).length,
              )}
            />
            <CookieSummaryStat
              label="Secure"
              value={String(largestCookieGroup.cookies.filter((cookie) => cookie.secure).length)}
            />
            <CookieSummaryStat
              label="HttpOnly"
              value={String(largestCookieGroup.cookies.filter((cookie) => cookie.httpOnly).length)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function CookieRiskFocusButton({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="rounded-md border border-border-subtle bg-surface px-2 py-2 text-left text-[11px] text-text-subtle hover:text-text"
      onClick={onClick}
    >
      <div className="text-text">{title}</div>
      <div>{description}</div>
    </button>
  );
}
