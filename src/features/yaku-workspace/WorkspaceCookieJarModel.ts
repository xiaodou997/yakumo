import type { YakuCookieRecord } from "../../lib/yaku-client";

export function groupCookiesByDomainAndPath(cookies: YakuCookieRecord[]) {
  const grouped = new Map<string, YakuCookieRecord[]>();
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
    .sort((left, right) =>
      left.domain.localeCompare(right.domain) || left.path.localeCompare(right.path),
    );
}

export function sortCookieGroups(
  groups: Array<{ domain: string; path: string; cookies: YakuCookieRecord[] }>,
  sort: string,
) {
  const sorted = [...groups];
  if (sort === "smallest") {
    return sorted.sort((left, right) => {
      if (left.cookies.length !== right.cookies.length) {
        return left.cookies.length - right.cookies.length;
      }
      return left.domain.localeCompare(right.domain) || left.path.localeCompare(right.path);
    });
  }
  if (sort === "domain") {
    return sorted.sort(
      (left, right) =>
        left.domain.localeCompare(right.domain) || left.path.localeCompare(right.path),
    );
  }
  return sorted.sort((left, right) => {
    if (right.cookies.length !== left.cookies.length) {
      return right.cookies.length - left.cookies.length;
    }
    return left.domain.localeCompare(right.domain) || left.path.localeCompare(right.path);
  });
}

export function normalizeCookieSameSite(value: string | null) {
  if (value == null || value.trim() === "") {
    return "__unset__";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "none" || normalized === "lax" || normalized === "strict") {
    return normalized;
  }

  return "__other__";
}

export function describeCookieSameSite(value: string | null) {
  const normalized = normalizeCookieSameSite(value);
  if (normalized === "__unset__") {
    return "SameSite unset";
  }
  if (normalized === "__other__") {
    return `SameSite ${value}`;
  }
  if (normalized === "none") {
    return "SameSite None";
  }
  if (normalized === "lax") {
    return "SameSite Lax";
  }
  return "SameSite Strict";
}

export function formatCookieDate(value: string | null) {
  if (value == null) {
    return "session";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
