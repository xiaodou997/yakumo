import { useDeferredValue, useMemo, type ReactNode } from "react";
import { FormattedError } from "../../components/core/FormattedError";
import { Select } from "../../components/core/Select";
import { VStack } from "../../components/core/Stacks";
import {
  decodeYakuBody,
  formatJsonIfPossible,
  type YakuRunBody,
} from "../../lib/yaku-client";

export function YakuBodyViewer({
  bodies,
  selectedBodyId,
  setSelectedBodyId,
  bodyBytes,
  error,
}: {
  bodies: YakuRunBody[];
  selectedBodyId: string;
  setSelectedBodyId: (value: string) => void;
  bodyBytes?: number[];
  error: unknown;
}) {
  const selectedBody = bodies.find((body) => body.id === selectedBodyId) ?? null;

  const bodyText = useMemo(() => {
    if (bodyBytes == null) return "";
    return decodeYakuBody(bodyBytes);
  }, [bodyBytes]);
  const deferredBodyText = useDeferredValue(bodyText);
  const formattedBodyText = useMemo(() => {
    if (selectedBody?.contentType?.includes("json")) {
      return formatJsonIfPossible(deferredBodyText);
    }
    return deferredBodyText;
  }, [deferredBodyText, selectedBody?.contentType]);

  return (
    <VStack space={3}>
      <Select
        name="yaku-run-body"
        label="Body"
        value={selectedBodyId || "__none__"}
        options={
          bodies.length === 0
            ? [{ label: "No Bodies", value: "__none__" }]
            : bodies.map((body) => ({
                label: `${body.bodyRole} · ${body.contentType ?? body.storageKind}`,
                value: body.id,
              }))
        }
        onChange={(value) => setSelectedBodyId(value === "__none__" ? "" : value)}
      />
      {error ? (
        <FormattedError>{String(error)}</FormattedError>
      ) : selectedBody == null ? (
        <EmptyCopy>No persisted body for this run.</EmptyCopy>
      ) : (
        <VStack space={2}>
          <div className="grid gap-2 md:grid-cols-3">
            <BodyMeta label="Role" value={selectedBody.bodyRole} />
            <BodyMeta label="Bytes" value={selectedBody.byteLength.toLocaleString()} />
            <BodyMeta label="Storage" value={selectedBody.storageKind} />
          </div>
          <pre className="max-h-[320px] overflow-auto rounded-xl border border-border-subtle bg-surface p-3 text-xs text-text-subtle">
            {formattedBodyText || "Body is empty."}
          </pre>
        </VStack>
      )}
    </VStack>
  );
}

function BodyMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface px-3 py-2">
      <div className="text-xs uppercase tracking-[0.18em] text-text-subtlest">{label}</div>
      <div className="mt-1 truncate text-sm text-text">{value}</div>
    </div>
  );
}

function EmptyCopy({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border-subtle bg-surface px-3 py-6 text-center text-sm text-text-subtle">
      {children}
    </div>
  );
}
