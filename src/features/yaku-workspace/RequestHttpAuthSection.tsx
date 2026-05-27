import { fieldClassName } from "./RequestFieldPrimitives";
import type { RequestHttpAuthSectionProps } from "./RequestHttpGraphqlTypes";

export function RequestHttpAuthSection({
  authType,
  setAuthType,
  username,
  setUsername,
  password,
  setPassword,
  token,
  setToken,
  passwordSecretId,
  tokenSecretId,
}: RequestHttpAuthSectionProps) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">
        Auth
      </div>
      <select
        value={authType}
        onChange={(event) => setAuthType(event.target.value)}
        className={`${fieldClassName} mt-3`}
      >
        <option value="none">None</option>
        <option value="basic">Basic</option>
        <option value="bearer">Bearer</option>
      </select>
      {authType === "basic" ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            className={fieldClassName}
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            className={fieldClassName}
          />
        </div>
      ) : null}
      {authType === "basic" && password === "" && passwordSecretId !== "" ? (
        <div className="mt-2 text-[11px] text-text-subtle">
          Password stored as secret.
        </div>
      ) : null}
      {authType === "bearer" ? (
        <input
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Bearer token"
          type="password"
          className={`${fieldClassName} mt-3`}
        />
      ) : null}
      {authType === "bearer" && token === "" && tokenSecretId !== "" ? (
        <div className="mt-2 text-[11px] text-text-subtle">
          Token stored as secret.
        </div>
      ) : null}
    </div>
  );
}
