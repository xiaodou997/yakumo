import classNames from "classnames";
import { Button } from "../../components/core/Button";
import { HStack } from "../../components/core/Stacks";
import type { YakuRunPageItem } from "../../lib/yaku-client";
import { formatRunComparisonTarget } from "./RunPanelsHistoryModel";

export function RunComparisonTargetChip({
  label,
  run,
  isActive,
  onUse,
  onInspect,
}: {
  label: string;
  run: YakuRunPageItem | null;
  isActive: boolean;
  onUse: () => void;
  onInspect: (runId: string) => void;
}) {
  return (
    <div
      className={classNames(
        "rounded-lg border px-3 py-3",
        isActive
          ? "border-border-focus bg-surface-highlight/40"
          : "border-border-subtle bg-surface",
      )}
    >
      <HStack justifyContent="between" alignItems="start" className="gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">
            {label}
          </div>
          <div className="mt-1 text-xs text-text">
            {run == null ? "Unavailable" : formatRunComparisonTarget(run)}
          </div>
          {run != null ? (
            <div className="mt-1 truncate text-[10px] text-text-subtlest">{run.id}</div>
          ) : null}
        </div>
        <HStack space={1} className="shrink-0">
          <Button
            size="2xs"
            type="button"
            variant="border"
            disabled={run == null || isActive}
            onClick={onUse}
          >
            {isActive ? "Active" : "Use"}
          </Button>
          {run != null ? (
            <Button
              size="2xs"
              type="button"
              variant="border"
              onClick={() => onInspect(run.id)}
            >
              Inspect
            </Button>
          ) : null}
        </HStack>
      </HStack>
    </div>
  );
}
