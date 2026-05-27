import type { YakuRunEvent } from "../../lib/yaku-client";
import {
  arrayLength,
  asOptionalBoolean,
  asOptionalNumber,
  asOptionalString,
} from "./RunEventParserCommon";

type HttpCookieEventCookie = {
  id: string;
  name: string;
  domain: string;
  path: string;
  expiresAt: string | null;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
};

export function parseHttpRequestHeaderEvent(event: YakuRunEvent) {
  if (event.kind !== "request_headers") {
    return null;
  }
  const method = asOptionalString(event.data.method);
  const url = asOptionalString(event.data.url);
  if (method == null || url == null) {
    return null;
  }

  return {
    method,
    url,
    auth: asOptionalString(event.data.auth) ?? "none",
    bodyMode: asOptionalString(event.data.bodyMode) ?? "unset",
    headerCount: arrayLength(event.data.headers),
    queryCount: arrayLength(event.data.query),
    followRedirects: asOptionalBoolean(event.data.followRedirects),
    timeoutMs: asOptionalNumber(event.data.timeoutMs),
  };
}

export function parseHttpResponseHeaderEvent(event: YakuRunEvent) {
  if (event.kind !== "response_headers") {
    return null;
  }
  const statusCode = asOptionalNumber(event.data.statusCode);
  if (statusCode == null) {
    return null;
  }
  return {
    statusCode,
    headerCount: arrayLength(event.data.headers),
    setCookieCount: asOptionalNumber(event.data.setCookieCount) ?? 0,
    persistedCookieCount: asOptionalNumber(event.data.persistedCookieCount) ?? 0,
  };
}

export function parseHttpCookieEvent(event: YakuRunEvent) {
  if (event.kind === "request_headers") {
    const cookieJarId = asOptionalString(event.data.cookieJarId);
    const attachedCookieCount = asOptionalNumber(event.data.attachedCookieCount) ?? 0;
    const cookies = parseHttpCookieEventCookies(event.data.attachedCookies);
    if (cookieJarId == null && attachedCookieCount === 0 && cookies.length === 0) {
      return null;
    }
    return {
      kind: "request_headers" as const,
      cookieJarId,
      attachedCookieCount,
      cookies,
    };
  }
  if (event.kind === "response_headers") {
    const setCookieCount = asOptionalNumber(event.data.setCookieCount) ?? 0;
    const persistedCookieCount = asOptionalNumber(event.data.persistedCookieCount) ?? 0;
    const cookies = parseHttpCookieEventCookies(event.data.persistedCookies);
    if (setCookieCount === 0 && persistedCookieCount === 0 && cookies.length === 0) {
      return null;
    }
    return {
      kind: "response_headers" as const,
      setCookieCount,
      persistedCookieCount,
      cookies,
    };
  }
  return null;
}

export function groupHttpEventCookies(cookies: HttpCookieEventCookie[]) {
  const grouped = new Map<string, HttpCookieEventCookie[]>();
  for (const cookie of cookies) {
    const key = `${cookie.domain}@@${cookie.path}`;
    const existing = grouped.get(key);
    if (existing == null) {
      grouped.set(key, [cookie]);
      continue;
    }
    existing.push(cookie);
  }
  return [...grouped.entries()]
    .map(([key, groupCookies]) => {
      const [domain = "", path = ""] = key.split("@@");
      return {
        domain,
        path,
        cookies: groupCookies.sort((left, right) => left.name.localeCompare(right.name)),
      };
    })
    .sort((left, right) => left.domain.localeCompare(right.domain) || left.path.localeCompare(right.path));
}

function parseHttpCookieEventCookies(value: unknown): HttpCookieEventCookie[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is Record<string, unknown> => item != null && typeof item === "object")
    .map((item) => ({
      id: asOptionalString(item.id) ?? "",
      name: asOptionalString(item.name) ?? "",
      domain: asOptionalString(item.domain) ?? "",
      path: asOptionalString(item.path) ?? "/",
      expiresAt: asOptionalString(item.expiresAt),
      secure: item.secure === true,
      httpOnly: item.httpOnly === true,
      sameSite: asOptionalString(item.sameSite),
    }))
    .filter((item) => item.name !== "");
}
