import { CheckboxField, PairListEditor } from "./RequestFieldPrimitives";
import { VStack } from "../../components/core/Stacks";
import type { RequestSseSectionProps } from "./RequestRealtimeTypes";
import { ProtocolSection, StatChip, TimeoutField } from "./RequestProtocolCommon";

export function RequestSseSection({
  headers,
  setHeaders,
  query,
  setQuery,
  followRedirects,
  setFollowRedirects,
  timeoutMs,
  setTimeoutMs,
}: RequestSseSectionProps) {
  const enabledHeaders = headers.filter((pair) => pair.enabled !== false).length;
  const enabledQuery = query.filter((pair) => pair.enabled !== false).length;

  return (
    <VStack space={2}>
      <ProtocolSection
        title="Stream Request"
        description="SSE opens a GET request with `Accept: text/event-stream` and keeps the response stream open until the server closes it, the timeout expires, or you cancel the run."
      >
        <div className="grid gap-2 md:grid-cols-2">
          <StatChip label="Enabled Headers" value={String(enabledHeaders)} />
          <StatChip label="Enabled Query Params" value={String(enabledQuery)} />
        </div>
        <PairListEditor
          title="Request Headers"
          pairs={headers}
          setPairs={setHeaders}
          namePlaceholder="Header"
          valuePlaceholder="Value"
        />
        <PairListEditor
          title="Connection Query"
          pairs={query}
          setPairs={setQuery}
          includeEnabled
          namePlaceholder="Parameter"
          valuePlaceholder="Value"
        />
      </ProtocolSection>
      <ProtocolSection
        title="Stream Behavior"
        description="Redirect and timeout settings control how long the event stream stays attached and whether intermediate redirects are followed before the stream begins."
      >
        <CheckboxField checked={followRedirects} onChange={setFollowRedirects}>
          Follow redirects before attaching to the event stream
        </CheckboxField>
        <TimeoutField
          value={timeoutMs}
          onChange={setTimeoutMs}
          allowUnset
          description="Leave empty to allow the stream to stay open until cancel or server close."
        />
      </ProtocolSection>
    </VStack>
  );
}
