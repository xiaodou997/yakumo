import { PairListEditor } from "./RequestFieldPrimitives";
import type { RequestWebSocketHandshakeSectionProps } from "./RequestRealtimeTypes";
import { ProtocolSection, StatChip } from "./RequestProtocolCommon";

export function RequestWebSocketHandshakeSection({
  headers,
  setHeaders,
  query,
  setQuery,
}: RequestWebSocketHandshakeSectionProps) {
  const enabledHeaders = headers.filter((pair) => pair.enabled !== false).length;
  const enabledQuery = query.filter((pair) => pair.enabled !== false).length;

  return (
    <ProtocolSection
      title="Connection Handshake"
      description="Handshake headers and query parameters are attached before the socket upgrades. Use them for auth, channel selection, and other connect-time parameters."
    >
      <div className="grid gap-2 md:grid-cols-2">
        <StatChip label="Enabled Headers" value={String(enabledHeaders)} />
        <StatChip label="Enabled Query Params" value={String(enabledQuery)} />
      </div>
      <PairListEditor
        title="Handshake Headers"
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
  );
}
