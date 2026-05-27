import { useMemo, useState } from "react";
import type { YakuCookieRecord } from "../../lib/yaku-client";
import {
  groupCookiesByDomainAndPath,
  normalizeCookieSameSite,
  sortCookieGroups,
} from "./WorkspaceCookieJarModel";

export function useWorkspaceCookieJarListState(cookies: YakuCookieRecord[]) {
  const [domainFilter, setDomainFilter] = useState("");
  const [pathFilter, setPathFilter] = useState("");
  const [persistenceFilter, setPersistenceFilter] = useState("__all__");
  const [securityFilter, setSecurityFilter] = useState("__all__");
  const [scriptabilityFilter, setScriptabilityFilter] = useState("__all__");
  const [sameSiteFilter, setSameSiteFilter] = useState("__all__");
  const [groupSort, setGroupSort] = useState("largest");
  const [batchDeleteScope, setBatchDeleteScope] = useState("");
  const [batchDeleteFeedback, setBatchDeleteFeedback] = useState("");

  const baseFilteredCookies = useMemo(() => {
    const normalizedDomain = domainFilter.trim().toLowerCase();
    const normalizedPath = pathFilter.trim();
    return cookies.filter((cookie) => {
      if (normalizedDomain !== "" && !cookie.domain.toLowerCase().includes(normalizedDomain)) {
        return false;
      }
      if (normalizedPath !== "" && !cookie.path.includes(normalizedPath)) {
        return false;
      }
      if (persistenceFilter === "persistent" && cookie.expiresAt == null) {
        return false;
      }
      if (persistenceFilter === "session" && cookie.expiresAt != null) {
        return false;
      }
      if (securityFilter === "secure" && !cookie.secure) {
        return false;
      }
      if (securityFilter === "insecure" && cookie.secure) {
        return false;
      }
      if (scriptabilityFilter === "http_only" && !cookie.httpOnly) {
        return false;
      }
      if (scriptabilityFilter === "script_readable" && cookie.httpOnly) {
        return false;
      }
      return true;
    });
  }, [cookies, domainFilter, pathFilter, persistenceFilter, scriptabilityFilter, securityFilter]);

  const filteredCookies = useMemo(() => {
    return baseFilteredCookies.filter((cookie) => {
      if (sameSiteFilter === "__all__") {
        return true;
      }
      const normalizedSameSite = normalizeCookieSameSite(cookie.sameSite);
      if (sameSiteFilter === "__unset__") {
        return normalizedSameSite === "__unset__";
      }
      return normalizedSameSite === sameSiteFilter;
    });
  }, [baseFilteredCookies, sameSiteFilter]);

  const groupedCookies = useMemo(
    () => sortCookieGroups(groupCookiesByDomainAndPath(filteredCookies), groupSort),
    [filteredCookies, groupSort],
  );
  const topCookieGroups = useMemo(
    () => sortCookieGroups(groupCookiesByDomainAndPath(filteredCookies), "largest").slice(0, 5),
    [filteredCookies],
  );
  const largestCookieGroup = topCookieGroups[0] ?? null;
  const cookieRiskSummary = useMemo(() => {
    const stats = {
      insecure: 0,
      scriptReadable: 0,
      session: 0,
      sameSiteUnset: 0,
    };

    for (const cookie of baseFilteredCookies) {
      if (!cookie.secure) {
        stats.insecure += 1;
      }
      if (!cookie.httpOnly) {
        stats.scriptReadable += 1;
      }
      if (cookie.expiresAt == null) {
        stats.session += 1;
      }
      if (normalizeCookieSameSite(cookie.sameSite) === "__unset__") {
        stats.sameSiteUnset += 1;
      }
    }

    return stats;
  }, [baseFilteredCookies]);

  const hasCookieFilters =
    domainFilter !== "" ||
    pathFilter !== "" ||
    persistenceFilter !== "__all__" ||
    securityFilter !== "__all__" ||
    scriptabilityFilter !== "__all__" ||
    sameSiteFilter !== "__all__" ||
    groupSort !== "largest";

  const focusGroup = (domain: string, path: string) => {
    setDomainFilter(domain);
    setPathFilter(path);
    setBatchDeleteFeedback("");
  };

  const clearFeedback = () => setBatchDeleteFeedback("");

  const resetFilters = () => {
    setDomainFilter("");
    setPathFilter("");
    setPersistenceFilter("__all__");
    setSecurityFilter("__all__");
    setScriptabilityFilter("__all__");
    setSameSiteFilter("__all__");
    setGroupSort("largest");
    setBatchDeleteFeedback("");
  };

  return {
    domainFilter,
    setDomainFilter,
    pathFilter,
    setPathFilter,
    persistenceFilter,
    setPersistenceFilter,
    securityFilter,
    setSecurityFilter,
    scriptabilityFilter,
    setScriptabilityFilter,
    sameSiteFilter,
    setSameSiteFilter,
    groupSort,
    setGroupSort,
    batchDeleteScope,
    setBatchDeleteScope,
    batchDeleteFeedback,
    setBatchDeleteFeedback,
    filteredCookies,
    groupedCookies,
    topCookieGroups,
    largestCookieGroup,
    cookieRiskSummary,
    hasCookieFilters,
    focusGroup,
    clearFeedback,
    resetFilters,
  };
}
