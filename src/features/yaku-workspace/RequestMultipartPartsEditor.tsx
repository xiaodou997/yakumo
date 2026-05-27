import { Button } from "../../components/core/Button";
import type { MultipartPart } from "./requestConfig";
import { createMultipartPart } from "./requestConfig";
import { RequestMultipartPartCard } from "./RequestMultipartPartCard";

export function RequestMultipartPartsEditor({
  parts,
  setParts,
}: {
  parts: MultipartPart[];
  setParts: (parts: MultipartPart[]) => void;
}) {
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-text-subtlest">
          Parts
        </div>
        <Button
          size="2xs"
          variant="border"
          onClick={() => setParts([...parts, createMultipartPart()])}
        >
          Add Part
        </Button>
      </div>
      {parts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-subtle p-3 text-xs text-text-subtle">
          No multipart parts yet.
        </div>
      ) : (
        parts.map((part, index) => (
          <RequestMultipartPartCard
            key={part.id}
            parts={parts}
            setParts={setParts}
            part={part}
            index={index}
          />
        ))
      )}
    </div>
  );
}
