import { VStack } from "../../components/core/Stacks";
import { formatEventDate } from "./RunEventFormatters";
import { groupHttpEventCookies } from "./RunEventParser";
import { EventStatChip } from "./RunPanelsCompareShared";

type HttpCookieShape = {
  id: string;
  name: string;
  domain: string;
  path: string;
  expiresAt: string | null;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
};

export function HttpRequestHeaderEventCard({
  event,
}: {
  event: {
    method: string;
    url: string;
    auth: string;
    bodyMode: string;
    headerCount: number;
    queryCount: number;
    followRedirects: boolean | null;
    timeoutMs: number | null;
  };
}) {
  return (
    <VStack space={2}>
      <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-3 py-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">Request</div>
        <div className="mt-2 break-all text-sm text-text">
          {event.method} {event.url}
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        <EventStatChip label="Auth" value={event.auth} />
        <EventStatChip label="Body Mode" value={event.bodyMode} />
        <EventStatChip label="Headers" value={String(event.headerCount)} />
        <EventStatChip label="Query" value={String(event.queryCount)} />
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <EventStatChip
          label="Redirects"
          value={
            event.followRedirects == null
              ? "unset"
              : event.followRedirects
                ? "follow"
                : "no follow"
          }
        />
        <EventStatChip
          label="Timeout"
          value={event.timeoutMs == null ? "unset" : `${event.timeoutMs.toLocaleString()} ms`}
        />
      </div>
    </VStack>
  );
}

export function HttpResponseHeaderEventCard({
  event,
}: {
  event: {
    statusCode: number;
    headerCount: number;
    setCookieCount: number;
    persistedCookieCount: number;
  };
}) {
  return (
    <div className="grid gap-2 md:grid-cols-4">
      <EventStatChip label="Status" value={String(event.statusCode)} />
      <EventStatChip label="Headers" value={String(event.headerCount)} />
      <EventStatChip label="Set-Cookie" value={String(event.setCookieCount)} />
      <EventStatChip label="Persisted" value={String(event.persistedCookieCount)} />
    </div>
  );
}

export function HttpCookieEventCard({
  event,
}: {
  event:
    | {
        kind: "request_headers";
        cookieJarId: string | null;
        attachedCookieCount: number;
        cookies: HttpCookieShape[];
      }
    | {
        kind: "response_headers";
        setCookieCount: number;
        persistedCookieCount: number;
        cookies: HttpCookieShape[];
      };
}) {
  const groups = groupHttpEventCookies(event.cookies);
  return (
    <VStack space={2}>
      <div className="grid gap-2 md:grid-cols-3">
        {event.kind === "request_headers" ? (
          <>
            <EventStatChip label="Cookie Jar" value={event.cookieJarId ?? "none"} />
            <EventStatChip label="Attached" value={String(event.attachedCookieCount)} />
            <EventStatChip label="Groups" value={String(groups.length)} />
          </>
        ) : (
          <>
            <EventStatChip label="Set-Cookie" value={String(event.setCookieCount)} />
            <EventStatChip label="Persisted" value={String(event.persistedCookieCount)} />
            <EventStatChip label="Groups" value={String(groups.length)} />
          </>
        )}
      </div>
      {groups.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-3 py-3 text-xs text-text-subtle">
          {event.kind === "request_headers"
            ? "No matching jar cookies were attached."
            : "No response cookies were persisted."}
        </div>
      ) : (
        <VStack space={2}>
          {groups.map((group) => (
            <div
              key={`${group.domain}|${group.path}`}
              className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-3 py-3"
            >
              <div className="text-xs font-medium text-text">{group.domain}</div>
              <div className="mt-1 text-[11px] text-text-subtlest">
                Path {group.path} · {group.cookies.length} cookie{group.cookies.length === 1 ? "" : "s"}
              </div>
              <div className="mt-2 space-y-2">
                {group.cookies.map((cookie) => (
                  <div key={cookie.id} className="rounded-md border border-border-subtle bg-surface px-2 py-2">
                    <div className="text-xs font-medium text-text">{cookie.name}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-text-subtlest">
                      <span>{cookie.httpOnly ? "HttpOnly" : "JS readable"}</span>
                      <span>{cookie.secure ? "Secure" : "Insecure"}</span>
                      <span>{cookie.sameSite != null ? `SameSite ${cookie.sameSite}` : "SameSite unset"}</span>
                      <span>{cookie.expiresAt != null ? formatEventDate(cookie.expiresAt) : "Session"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </VStack>
      )}
    </VStack>
  );
}
