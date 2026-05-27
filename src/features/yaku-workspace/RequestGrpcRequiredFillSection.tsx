import { Button } from "../../components/core/Button";
import type { RequestGrpcSelectedMethodRequiredFillProps } from "./RequestGrpcTypes";

export function RequestGrpcRequiredFillSection({
  requiredFill,
  selectedMethodShape,
}: {
  requiredFill: RequestGrpcSelectedMethodRequiredFillProps;
  selectedMethodShape: "unary" | "streaming" | null;
}) {
  const {
    selectedMethodMissingRequiredFields,
    selectedMissingRequiredFieldPaths,
    selectedMissingRequiredFieldsCount,
    lastFillSummary,
    onFillMissingRequired,
    onSelectAllMissingRequired,
    onClearSelectedMissingRequired,
    onReviewRequired,
    onReviewChanges,
    onFillSelectedRequired,
    onToggleSelectedMissingRequiredFieldPath,
    onLocateMissingRequiredField,
  } = requiredFill;

  return (
    <div className="mt-3 rounded-lg border border-border-subtle bg-surface px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">
            Required Fill Preview
          </div>
          <div className="mt-1 text-[11px] text-text-subtle">
            Review the missing required fields that `Fill Missing Required` would add.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="2xs"
            variant="border"
            disabled={selectedMethodMissingRequiredFields.length === 0}
            onClick={onSelectAllMissingRequired}
          >
            Select All
          </Button>
          <Button
            size="2xs"
            variant="border"
            disabled={selectedMissingRequiredFieldPaths.length === 0}
            onClick={onClearSelectedMissingRequired}
          >
            Clear Selection
          </Button>
          <Button
            size="2xs"
            variant="border"
            disabled={selectedMethodMissingRequiredFields.length === 0}
            onClick={onReviewRequired}
          >
            Review Required
          </Button>
          <Button
            size="2xs"
            variant="border"
            disabled={lastFillSummary == null}
            onClick={onReviewChanges}
          >
            Review Changes
          </Button>
          <Button
            size="2xs"
            variant="border"
            disabled={selectedMethodShape !== "unary" || selectedMissingRequiredFieldsCount === 0}
            onClick={onFillSelectedRequired}
          >
            Fill Selected
          </Button>
          <Button
            size="2xs"
            variant="border"
            disabled={selectedMethodMissingRequiredFields.length === 0 || selectedMethodShape !== "unary"}
            onClick={onFillMissingRequired}
          >
            Fill Missing Required
          </Button>
        </div>
      </div>
      {selectedMethodMissingRequiredFields.length === 0 ? (
        <div className="mt-3 text-xs text-text-subtle">
          All required fields are currently present.
        </div>
      ) : (
        <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
          {selectedMethodMissingRequiredFields.map((field) => (
            <div
              key={`missing-required-${field.path}`}
              className="rounded-md border border-border-subtle bg-surface-highlight/35 px-2 py-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <label className="flex items-center gap-2 text-[11px] text-text-subtle">
                    <input
                      type="checkbox"
                      checked={selectedMissingRequiredFieldPaths.includes(field.path)}
                      onChange={() => onToggleSelectedMissingRequiredFieldPath(field.path)}
                    />
                    Select
                  </label>
                  <div className="break-all font-mono text-[11px] text-text">
                    {field.path}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] text-text-subtlest">
                    <span>{field.kind}</span>
                    <span>{field.messageState}</span>
                  </div>
                  <div className="mt-2 break-all text-[11px] text-text-subtle">
                    {field.examplePreview}
                  </div>
                </div>
                <Button
                  size="2xs"
                  variant="border"
                  onClick={() => onLocateMissingRequiredField(field.path)}
                >
                  Locate
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
