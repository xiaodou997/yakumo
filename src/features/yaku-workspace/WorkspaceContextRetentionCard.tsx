import { Button } from "../../components/core/Button";
import { HStack, VStack } from "../../components/core/Stacks";
import type { YakuGcReport } from "../../lib/yaku-client";

export function WorkspaceContextRetentionCard({
  selectedWorkspaceId,
  retention,
  gcReport,
  isSettingRetention,
  isClearingRetention,
  isGcBodies,
  onSetRetention,
  onClearRetention,
  onGcBodies,
}: {
  selectedWorkspaceId: string | null | undefined;
  retention: number | null | undefined;
  gcReport?: YakuGcReport;
  isSettingRetention: boolean;
  isClearingRetention: boolean;
  isGcBodies: boolean;
  onSetRetention: (limit: number) => void;
  onClearRetention: () => void;
  onGcBodies: () => void;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <HStack justifyContent="between" alignItems="start" className="gap-3">
        <VStack space={1}>
          <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">
            Run Retention
          </div>
          <div className="text-sm text-text">
            {retention == null ? "Unlimited" : `${retention.toLocaleString()} runs`}
          </div>
        </VStack>
        <Button size="xs" variant="border" isLoading={isGcBodies} onClick={onGcBodies}>
          GC Bodies
        </Button>
      </HStack>
      <HStack space={2} wrap className="mt-3">
        <Button
          size="xs"
          variant="border"
          disabled={selectedWorkspaceId == null}
          isLoading={isSettingRetention}
          onClick={() => onSetRetention(25)}
        >
          Keep 25
        </Button>
        <Button
          size="xs"
          variant="border"
          disabled={selectedWorkspaceId == null}
          isLoading={isSettingRetention}
          onClick={() => onSetRetention(100)}
        >
          Keep 100
        </Button>
        <Button
          size="xs"
          variant="border"
          disabled={selectedWorkspaceId == null}
          isLoading={isClearingRetention}
          onClick={onClearRetention}
        >
          Clear
        </Button>
      </HStack>
      {gcReport != null ? (
        <div className="mt-3 text-xs text-text-subtle">
          Deleted {gcReport.deleted} files · Retained {gcReport.retained}
        </div>
      ) : null}
    </div>
  );
}
