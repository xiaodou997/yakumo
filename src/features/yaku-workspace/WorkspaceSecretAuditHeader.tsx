import { Button } from "../../components/core/Button";
import { HStack, VStack } from "../../components/core/Stacks";

export function WorkspaceSecretAuditHeader({
  selectedWorkspaceId,
  referencedCount,
  orphanCount,
  isSecretAuditLoading,
  isDeletingOrphanSecrets,
  canDeleteOrphans,
  onDeleteOrphans,
}: {
  selectedWorkspaceId: string | null | undefined;
  referencedCount: number | null;
  orphanCount: number | null;
  isSecretAuditLoading: boolean;
  isDeletingOrphanSecrets: boolean;
  canDeleteOrphans: boolean;
  onDeleteOrphans: () => void;
}) {
  return (
    <HStack justifyContent="between" alignItems="start" className="gap-3">
      <VStack space={1}>
        <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">
          Secrets Audit
        </div>
        <div className="text-sm text-text">
          {selectedWorkspaceId == null
            ? "Select a workspace"
            : referencedCount == null || orphanCount == null
              ? "No audit data yet"
              : `${referencedCount} referenced · ${orphanCount} orphan`}
        </div>
      </VStack>
      <HStack space={2} className="shrink-0">
        {isSecretAuditLoading ? <div className="text-xs text-text-subtle">Loading...</div> : null}
        <Button
          size="xs"
          type="button"
          variant="border"
          disabled={selectedWorkspaceId == null || !canDeleteOrphans}
          isLoading={isDeletingOrphanSecrets}
          onClick={onDeleteOrphans}
        >
          Delete Orphans
        </Button>
      </HStack>
    </HStack>
  );
}
