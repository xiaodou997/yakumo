import { Select } from "../../components/core/Select";
import { CookieSummaryStat } from "./WorkspaceCookieJarCards";

export function WorkspaceCookieJarFilters({
  jarId,
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
  groupCount,
  persistentCount,
  secureCount,
}: {
  jarId: string;
  domainFilter: string;
  setDomainFilter: (value: string) => void;
  pathFilter: string;
  setPathFilter: (value: string) => void;
  persistenceFilter: string;
  setPersistenceFilter: (value: string) => void;
  securityFilter: string;
  setSecurityFilter: (value: string) => void;
  scriptabilityFilter: string;
  setScriptabilityFilter: (value: string) => void;
  sameSiteFilter: string;
  setSameSiteFilter: (value: string) => void;
  groupSort: string;
  setGroupSort: (value: string) => void;
  groupCount: number;
  persistentCount: number;
  secureCount: number;
}) {
  return (
    <>
      <div className="grid gap-2 md:grid-cols-2">
        <input
          value={domainFilter}
          onChange={(event) => setDomainFilter(event.target.value)}
          placeholder="Filter domain"
          className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-text outline-none transition placeholder:text-text-subtlest focus:border-border-strong focus:ring-1 focus:ring-border-strong"
        />
        <input
          value={pathFilter}
          onChange={(event) => setPathFilter(event.target.value)}
          placeholder="Filter path"
          className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-text outline-none transition placeholder:text-text-subtlest focus:border-border-strong focus:ring-1 focus:ring-border-strong"
        />
      </div>
      <div className="grid gap-2 md:grid-cols-5">
        <Select
          name={`yaku-cookie-persistence-${jarId}`}
          label="Persistence"
          size="xs"
          value={persistenceFilter}
          options={[
            { label: "All", value: "__all__" },
            { label: "Persistent", value: "persistent" },
            { label: "Session", value: "session" },
          ]}
          onChange={setPersistenceFilter}
        />
        <Select
          name={`yaku-cookie-security-${jarId}`}
          label="Security"
          size="xs"
          value={securityFilter}
          options={[
            { label: "All", value: "__all__" },
            { label: "Secure", value: "secure" },
            { label: "Insecure", value: "insecure" },
          ]}
          onChange={setSecurityFilter}
        />
        <Select
          name={`yaku-cookie-scriptability-${jarId}`}
          label="Scriptability"
          size="xs"
          value={scriptabilityFilter}
          options={[
            { label: "All", value: "__all__" },
            { label: "HttpOnly", value: "http_only" },
            { label: "JS Readable", value: "script_readable" },
          ]}
          onChange={setScriptabilityFilter}
        />
        <Select
          name={`yaku-cookie-samesite-${jarId}`}
          label="SameSite"
          size="xs"
          value={sameSiteFilter}
          options={[
            { label: "All", value: "__all__" },
            { label: "Unset", value: "__unset__" },
            { label: "None", value: "none" },
            { label: "Lax", value: "lax" },
            { label: "Strict", value: "strict" },
            { label: "Other", value: "__other__" },
          ]}
          onChange={setSameSiteFilter}
        />
        <Select
          name={`yaku-cookie-group-sort-${jarId}`}
          label="Group Sort"
          size="xs"
          value={groupSort}
          options={[
            { label: "Largest First", value: "largest" },
            { label: "Smallest First", value: "smallest" },
            { label: "Domain", value: "domain" },
          ]}
          onChange={setGroupSort}
        />
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <CookieSummaryStat label="Groups" value={String(groupCount)} />
        <CookieSummaryStat label="Persistent" value={String(persistentCount)} />
        <CookieSummaryStat label="Secure" value={String(secureCount)} />
      </div>
    </>
  );
}
