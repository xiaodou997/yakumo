import { VStack } from "../../components/core/Stacks";
import { EventStatChip } from "./RunPanelsCompareShared";

export function RequestBodyEventCard({
  event,
}: {
  event:
    | {
        kind: "graphql" | "text" | "json";
        byteLength: number | null;
        text: string;
        graphql: {
          query: string | null;
          operationName: string | null;
          hasVariables: boolean;
        } | null;
      }
    | {
        kind: "file";
        byteLength: number | null;
        filePath: string | null;
      }
    | {
        kind: "multipart";
        partCount: number;
      }
    | {
        kind: "grpc";
        text: string;
      };
}) {
  if (event.kind === "file") {
    return (
      <div className="grid gap-2 md:grid-cols-2">
        <EventStatChip label="Mode" value="file" />
        <EventStatChip
          label="Bytes"
          value={event.byteLength == null ? "unknown" : event.byteLength.toLocaleString()}
        />
        <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-3 py-3 md:col-span-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">Path</div>
          <div className="mt-2 break-all text-xs text-text">{event.filePath ?? "missing"}</div>
        </div>
      </div>
    );
  }
  if (event.kind === "multipart") {
    return (
      <div className="grid gap-2 md:grid-cols-2">
        <EventStatChip label="Mode" value="multipart" />
        <EventStatChip label="Parts" value={String(event.partCount)} />
      </div>
    );
  }
  if (event.kind === "grpc") {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-3 py-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">gRPC Request Message</div>
        <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-xs text-text-subtle">
          {event.text}
        </pre>
      </div>
    );
  }

  return (
    <VStack space={2}>
      <div className="grid gap-2 md:grid-cols-3">
        <EventStatChip label="Mode" value={event.kind} />
        <EventStatChip
          label="Bytes"
          value={event.byteLength == null ? "unknown" : event.byteLength.toLocaleString()}
        />
        {event.graphql != null ? (
          <EventStatChip
            label="GraphQL"
            value={event.graphql.operationName ?? (event.graphql.hasVariables ? "variables set" : "query only")}
          />
        ) : null}
      </div>
      {event.graphql?.query != null ? (
        <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">Query</div>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-xs text-text-subtle">
            {event.graphql.query}
          </pre>
        </div>
      ) : (
        <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">Payload</div>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-xs text-text-subtle">
            {event.text}
          </pre>
        </div>
      )}
    </VStack>
  );
}
