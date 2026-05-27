import classNames from "classnames";
import { Button } from "../../components/core/Button";
import type { GrpcSchemaFieldEntry } from "./RequestGrpcSchemaTypes";

export function RequestGrpcSchemaNavigatorFieldCard({
  field,
  isExpanded,
  isRecentlyChanged,
  isLastInserted,
  selectedMethodShape,
  onToggleSchemaPath,
  onInsertGrpcBranch,
  onInsertGrpcField,
}: {
  field: GrpcSchemaFieldEntry;
  isExpanded: boolean;
  isRecentlyChanged: boolean;
  isLastInserted: boolean;
  selectedMethodShape: "unary" | "streaming" | null;
  onToggleSchemaPath: (path: string) => void;
  onInsertGrpcBranch: (field: GrpcSchemaFieldEntry) => void;
  onInsertGrpcField: (field: GrpcSchemaFieldEntry) => void;
}) {
  return (
    <div
      className={classNames(
        "rounded-md border px-2 py-2",
        isLastInserted
          ? "border-border-focus bg-surface-highlight/50"
          : field.messageState === "filled"
            ? "border-success/20 bg-success/5"
            : field.messageState === "partial"
              ? "border-warning/20 bg-warning/5"
              : "border-danger/20 bg-danger/5",
      )}
      style={{ paddingLeft: `${8 + field.depth * 12}px` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-sm border border-border-subtle bg-surface px-1 py-0.5 text-[10px] uppercase tracking-[0.12em] text-text-subtlest">
              L{field.depth + 1}
            </div>
            <div className="rounded-sm border border-border-subtle bg-surface px-1 py-0.5 text-[10px] uppercase tracking-[0.12em] text-text-subtlest">
              {field.isContainer ? "container" : "leaf"}
            </div>
            {isRecentlyChanged ? (
              <div className="rounded-sm border border-border-focus/40 bg-surface-highlight/50 px-1 py-0.5 text-[10px] uppercase tracking-[0.12em] text-text">
                changed
              </div>
            ) : null}
            <div
              className={classNames(
                "rounded-sm border px-1 py-0.5 text-[10px] uppercase tracking-[0.12em]",
                field.messageState === "filled"
                  ? "border-success/30 bg-success/10 text-success"
                  : field.messageState === "partial"
                    ? "border-warning/30 bg-warning/10 text-warning"
                    : "border-danger/30 bg-danger/10 text-danger",
              )}
            >
              {field.messageState}
            </div>
          </div>
          <div className="mt-2 break-all font-mono text-[11px] text-text">
            {field.displayName}
          </div>
          {field.parentPath != null ? (
            <div className="mt-1 break-all text-[10px] text-text-subtlest">
              in {field.parentPath}
            </div>
          ) : null}
          <div className="mt-1 break-all text-[10px] text-text-subtlest">
            {field.path}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] text-text-subtlest">
            <span>{field.kind}</span>
            <span>{field.required ? "required" : "optional"}</span>
            {field.isContainer ? <span>{field.childCount} children</span> : null}
          </div>
          <div className="mt-2 break-all text-[11px] text-text-subtle">
            {field.examplePreview}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {field.isContainer ? (
            <>
              <Button
                size="2xs"
                variant="border"
                onClick={() => onToggleSchemaPath(field.path)}
              >
                {isExpanded ? "Collapse" : "Expand"}
              </Button>
              <Button
                size="2xs"
                variant="border"
                disabled={selectedMethodShape !== "unary"}
                onClick={() => onInsertGrpcBranch(field)}
              >
                Insert Branch
              </Button>
              <Button
                size="2xs"
                variant="border"
                disabled={selectedMethodShape !== "unary"}
                onClick={() => onInsertGrpcField(field)}
              >
                Insert Example
              </Button>
            </>
          ) : (
            <Button
              size="2xs"
              variant="border"
              disabled={selectedMethodShape !== "unary"}
              onClick={() => onInsertGrpcField(field)}
            >
              Insert Field
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
