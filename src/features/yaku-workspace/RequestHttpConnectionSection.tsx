import { CheckboxField, PairListEditor } from "./RequestFieldPrimitives";
import { TimeoutField } from "./RequestProtocolCommon";
import type { RequestHttpConnectionSectionProps } from "./RequestHttpGraphqlTypes";

export function RequestHttpConnectionSection({
  headers,
  setHeaders,
  query,
  setQuery,
  followRedirects,
  setFollowRedirects,
  timeoutMs,
  setTimeoutMs,
}: RequestHttpConnectionSectionProps) {
  return (
    <>
      <PairListEditor
        title="Headers"
        pairs={headers}
        setPairs={setHeaders}
        namePlaceholder="Header"
        valuePlaceholder="Value"
      />
      <PairListEditor
        title="Query"
        pairs={query}
        setPairs={setQuery}
        includeEnabled
        namePlaceholder="Parameter"
        valuePlaceholder="Value"
      />
      <CheckboxField checked={followRedirects} onChange={setFollowRedirects}>
        Follow redirects
      </CheckboxField>
      <TimeoutField
        value={timeoutMs}
        onChange={setTimeoutMs}
        allowUnset
        description="Leave unset to use the default transport timeout."
      />
    </>
  );
}
