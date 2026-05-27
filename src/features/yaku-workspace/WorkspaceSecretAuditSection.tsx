import { InlineCode } from "../../components/core/InlineCode";
import { VStack } from "../../components/core/Stacks";
import { showConfirmDelete } from "../../lib/confirm";
import type { YakuSecretAudit, YakuSecretCleanupResponse } from "../../lib/yaku-client";
import { WorkspaceSecretAuditBody } from "./WorkspaceSecretAuditBody";
import { WorkspaceSecretAuditEmptyState } from "./WorkspaceSecretAuditEmptyState";
import { WorkspaceSecretAuditHeader } from "./WorkspaceSecretAuditHeader";
import { useWorkspaceSecretAuditState } from "./useWorkspaceSecretAuditState";

export function WorkspaceSecretAuditSection({
  selectedWorkspaceId,
  secretAudit,
  secretAuditError,
  isSecretAuditLoading,
  isDeletingSecret,
  isDeletingOrphanSecrets,
  orphanCleanupResult,
  onDeleteSecret,
  onDeleteOrphanSecrets,
  onSelectSecretRequest,
}: {
  selectedWorkspaceId: string | null | undefined;
  secretAudit: YakuSecretAudit | undefined;
  secretAuditError: unknown;
  isSecretAuditLoading: boolean;
  isDeletingSecret: boolean;
  isDeletingOrphanSecrets: boolean;
  orphanCleanupResult?: YakuSecretCleanupResponse | null;
  onDeleteSecret: (secretId: string) => void;
  onDeleteOrphanSecrets: () => void;
  onSelectSecretRequest: (requestId: string) => void;
  }) {
  const state = useWorkspaceSecretAuditState(secretAudit);

  const handleDeleteSecret = async (secretId: string) => {
    const item = secretAudit?.items.find((candidate) => candidate.secret.id === secretId);
    if (item == null) {
      onDeleteSecret(secretId);
      return;
    }

    const confirmed = await showConfirmDelete({
      id: "confirm-delete-yaku-orphan-secret",
      title: "Delete Orphan Secret",
      description: (
        <>
          This removes orphan secret <InlineCode>{item.secret.name || secretId}</InlineCode> from the
          workspace secret store. Referenced secrets are rejected before delete.
        </>
      ),
    });

    if (!confirmed) {
      return;
    }

    onDeleteSecret(secretId);
  };

  const handleDeleteOrphanSecrets = async () => {
    if (secretAudit == null || secretAudit.orphanCount === 0) {
      return;
    }

    const confirmed = await showConfirmDelete({
      id: "confirm-delete-yaku-orphan-secrets",
      title: "Delete Orphan Secrets",
      description: (
        <>
          This deletes <InlineCode>{String(secretAudit.orphanCount)}</InlineCode> orphan secret
          {secretAudit.orphanCount === 1 ? "" : "s"} from the current workspace. Referenced secrets
          are kept.
        </>
      ),
    });

    if (!confirmed) {
      return;
    }

    onDeleteOrphanSecrets();
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <VStack space={2}>
        <WorkspaceSecretAuditHeader
          selectedWorkspaceId={selectedWorkspaceId}
          referencedCount={secretAudit?.referencedCount ?? null}
          orphanCount={secretAudit?.orphanCount ?? null}
          isSecretAuditLoading={isSecretAuditLoading}
          isDeletingOrphanSecrets={isDeletingOrphanSecrets}
          canDeleteOrphans={
            secretAudit != null && secretAudit.orphanCount > 0
          }
          onDeleteOrphans={() => void handleDeleteOrphanSecrets()}
        />
        <WorkspaceSecretAuditBody
          secretAudit={secretAudit as YakuSecretAudit}
          state={state}
          isDeletingSecret={isDeletingSecret}
          onSelectSecretRequest={onSelectSecretRequest}
          onDelete={handleDeleteSecret}
        />
        <WorkspaceSecretAuditEmptyState
          selectedWorkspaceId={selectedWorkspaceId}
          error={secretAuditError}
          cleanupMessage={
            orphanCleanupResult == null
              ? null
              : orphanCleanupResult.deletedCount === 0
                ? "Orphan cleanup found nothing to delete."
                : `Deleted ${orphanCleanupResult.deletedCount} orphan secret${orphanCleanupResult.deletedCount === 1 ? "" : "s"}.`
          }
          hasAuditItems={secretAudit != null && secretAudit.items.length > 0}
          hasFilteredItems={state.filteredSecretItems.length > 0}
        />
      </VStack>
    </div>
  );
}
