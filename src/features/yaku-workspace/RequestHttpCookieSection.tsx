import { fieldClassName } from "./RequestFieldPrimitives";
import type { RequestHttpCookieSectionProps } from "./RequestHttpGraphqlTypes";

export function RequestHttpCookieSection({
  cookieJarId,
  setCookieJarId,
  cookieJars,
}: RequestHttpCookieSectionProps) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-text-subtlest">
        Cookie Jar
      </div>
      <select
        value={cookieJarId || "__none__"}
        onChange={(event) =>
          setCookieJarId(event.target.value === "__none__" ? "" : event.target.value)
        }
        className={fieldClassName}
      >
        <option value="__none__">No cookie jar</option>
        {cookieJars.map((jar) => (
          <option key={jar.id} value={jar.id}>
            {jar.name}
          </option>
        ))}
      </select>
      <div className="mt-2 text-[11px] text-text-subtle">
        Selected jars send matching cookies and persist Set-Cookie response
        headers.
      </div>
    </div>
  );
}
