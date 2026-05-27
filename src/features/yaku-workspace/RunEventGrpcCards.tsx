import { VStack } from "../../components/core/Stacks";
import { EventStatChip } from "./RunPanelsCompareShared";

export function GrpcRequestHeaderEventCard({
  event,
}: {
  event: {
    url: string;
    service: string;
    method: string;
    metadataCount: number;
    protoRootCount: number;
    protoFileCount: number;
    useReflection: boolean;
    timeoutMs: number | null;
  };
}) {
  return (
    <VStack space={2}>
      <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-3 py-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">gRPC Request</div>
        <div className="mt-2 break-all text-sm text-text">
          {event.service}.{event.method}
        </div>
        <div className="mt-1 break-all text-[11px] text-text-subtle">{event.url}</div>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        <EventStatChip label="Metadata" value={String(event.metadataCount)} />
        <EventStatChip label="Proto Roots" value={String(event.protoRootCount)} />
        <EventStatChip label="Proto Files" value={String(event.protoFileCount)} />
        <EventStatChip label="Reflection" value={event.useReflection ? "on" : "off"} />
      </div>
      <EventStatChip
        label="Timeout"
        value={event.timeoutMs == null ? "unset" : `${event.timeoutMs.toLocaleString()} ms`}
      />
    </VStack>
  );
}

export function GrpcMessageEventCard({
  event,
}: {
  event:
    | {
        type: "reflection_services";
        services: string[];
      }
    | {
        type: "json";
        json: unknown;
      };
}) {
  if (event.type === "reflection_services") {
    return (
      <VStack space={2}>
        <div className="grid gap-2 md:grid-cols-2">
          <EventStatChip label="Message" value="reflection services" />
          <EventStatChip label="Services" value={String(event.services.length)} />
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">Service List</div>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-xs text-text-subtle">
            {event.services.join("\n")}
          </pre>
        </div>
      </VStack>
    );
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">gRPC Message</div>
      <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-xs text-text-subtle">
        {JSON.stringify(event.json, null, 2)}
      </pre>
    </div>
  );
}
