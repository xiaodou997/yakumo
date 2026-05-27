import { fieldClassName, textareaClassName } from "./RequestFieldPrimitives";
import type { RequestGraphqlPayloadSectionProps } from "./RequestHttpGraphqlTypes";

export function RequestGraphqlPayloadSection({
  query,
  setQuery,
  variables,
  setVariables,
  operationName,
  setOperationName,
}: RequestGraphqlPayloadSectionProps) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-text-subtlest">
        GraphQL Payload
      </div>
      <input
        value={operationName}
        onChange={(event) => setOperationName(event.target.value)}
        placeholder="Operation name"
        className={fieldClassName}
      />
      <textarea
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        rows={8}
        placeholder="query { __typename }"
        className={`${textareaClassName} mt-3`}
      />
      <textarea
        value={variables}
        onChange={(event) => setVariables(event.target.value)}
        rows={5}
        placeholder='{"id":"123"}'
        className={`${textareaClassName} mt-3`}
      />
      <div className="mt-2 text-[11px] text-text-subtle">
        GraphQL requests are sent as JSON with `query`, optional `variables`,
        and optional `operationName`.
      </div>
    </div>
  );
}
