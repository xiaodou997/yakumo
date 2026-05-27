import classNames from "classnames";
import { Button } from "../../components/core/Button";
import { StatChip } from "./RequestProtocolCommon";
import type { GrpcFillSummary, GrpcMessageEditorNotice } from "./RequestGrpcTypes";

export function RequestGrpcMessageStatus({
  grpcMessageValidation,
  lastInsertedFieldPath,
  lastFillSummary,
  recentChangedContainerPaths,
  messageEditorNotice,
  onLocateInsertedField,
  onClearInsertedField,
  onLocateFillSummaryPath,
  onFocusChangedContainer,
  onReviewChangedContainers,
}: {
  grpcMessageValidation: {
    label: string;
    topLevelKeys: number;
    description: string;
  };
  lastInsertedFieldPath: string;
  lastFillSummary: GrpcFillSummary | null;
  recentChangedContainerPaths: string[];
  messageEditorNotice: GrpcMessageEditorNotice | null;
  onLocateInsertedField: () => void;
  onClearInsertedField: () => void;
  onLocateFillSummaryPath: (path: string) => void;
  onFocusChangedContainer: (path: string) => void;
  onReviewChangedContainers: () => void;
}) {
  return (
    <>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <StatChip label="Validation" value={grpcMessageValidation.label} />
        <StatChip
          label="Top-level Keys"
          value={String(grpcMessageValidation.topLevelKeys)}
        />
      </div>
      {lastInsertedFieldPath !== "" ? (
        <div className="mt-2 rounded-md border border-border-focus/60 bg-surface-highlight/50 px-2 py-2 text-[11px] text-text">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              Last inserted field:{" "}
              <span className="font-mono">{lastInsertedFieldPath}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="2xs" variant="border" onClick={onLocateInsertedField}>
                Locate
              </Button>
              <Button size="2xs" variant="border" onClick={onClearInsertedField}>
                Clear
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {lastFillSummary != null ? (
        <div className="mt-2 rounded-md border border-border-subtle bg-surface-highlight/35 px-2 py-2 text-[11px] text-text">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-text-subtlest">
              {lastFillSummary.title}
            </div>
            <Button
              size="2xs"
              variant="border"
              disabled={recentChangedContainerPaths.length === 0}
              onClick={onReviewChangedContainers}
            >
              Review Changed Containers
            </Button>
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <StatChip
              label="New"
              value={String(
                lastFillSummary.entries.filter((entry) => entry.previousState === "missing").length,
              )}
            />
            <StatChip
              label="Completed"
              value={String(
                lastFillSummary.entries.filter((entry) => entry.previousState === "partial").length,
              )}
            />
            <StatChip
              label="Containers"
              value={String(recentChangedContainerPaths.length)}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {lastFillSummary.entries.map((entry) => (
              <button
                key={`fill-summary-${entry.path}`}
                type="button"
                onClick={() => onLocateFillSummaryPath(entry.path)}
                className={classNames(
                  "rounded-md border px-2 py-1 text-[10px] hover:text-text",
                  entry.previousState === "missing"
                    ? "border-danger/30 bg-danger/5 text-danger"
                    : "border-warning/30 bg-warning/5 text-warning",
                )}
              >
                <span className="mr-2 uppercase tracking-[0.12em]">
                  {entry.previousState === "missing" ? "new" : "completed"}
                </span>
                <span className="font-mono">{entry.path}</span>
              </button>
            ))}
          </div>
          {recentChangedContainerPaths.length > 0 ? (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-text-subtlest">
                Affected Containers
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {recentChangedContainerPaths.map((path) => (
                  <button
                    key={`fill-container-${path}`}
                    type="button"
                    onClick={() => onFocusChangedContainer(path)}
                    className="rounded-md border border-border-subtle bg-surface px-2 py-1 font-mono text-[10px] text-text-subtle hover:text-text"
                  >
                    {path}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="mt-2 text-[11px] text-text-subtle">
        {grpcMessageValidation.description}
      </div>
      {messageEditorNotice != null ? (
        <div
          className={`mt-2 rounded-md border px-2 py-2 text-[11px] ${
            messageEditorNotice.tone === "danger"
              ? "border-danger/30 bg-danger/5 text-danger"
              : "border-success/30 bg-success/5 text-success"
          }`}
        >
          {messageEditorNotice.message}
        </div>
      ) : null}
    </>
  );
}
