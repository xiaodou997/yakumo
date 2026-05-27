import { WorkspaceSecretAuditList } from "./WorkspaceSecretAuditList";
import { WorkspaceSecretAuditOverview } from "./WorkspaceSecretAuditOverview";
import type { YakuSecretAudit } from "../../lib/yaku-client";
import type { ReturnTypeOfUseWorkspaceSecretAuditState } from "./useWorkspaceSecretAuditState";

export function WorkspaceSecretAuditBody({
  secretAudit,
  state,
  isDeletingSecret,
  onSelectSecretRequest,
  onDelete,
}: {
  secretAudit: YakuSecretAudit;
  state: ReturnTypeOfUseWorkspaceSecretAuditState;
  isDeletingSecret: boolean;
  onSelectSecretRequest: (requestId: string) => void;
  onDelete: (secretId: string) => void;
}) {
  return (
    <>
      <WorkspaceSecretAuditOverview
        totalCount={secretAudit.items.length}
        filteredCount={state.filteredSecretItems.length}
        secretKindFilter={state.secretKindFilter}
        setSecretKindFilter={state.setSecretKindFilter}
        secretStorageFilter={state.secretStorageFilter}
        setSecretStorageFilter={state.setSecretStorageFilter}
        secretKindOptions={state.secretKindOptions}
        secretStorageOptions={state.secretStorageOptions}
        secretOrphanOnly={state.secretOrphanOnly}
        setSecretOrphanOnly={state.setSecretOrphanOnly}
        secretHotspotsOnly={state.secretHotspotsOnly}
        setSecretHotspotsOnly={state.setSecretHotspotsOnly}
        secretSearch={state.secretSearch}
        setSecretSearch={state.setSecretSearch}
        secretSort={state.secretSort}
        setSecretSort={state.setSecretSort}
        hasActiveSecretFilters={state.hasActiveSecretFilters}
        onReset={state.resetFilters}
        activeSecretFilterSummary={state.activeSecretFilterSummary}
        referencedCount={state.referencedSecretItems.length}
        orphanCount={state.orphanSecretItems.length}
        hotspotCount={
          state.filteredSecretItems.filter(
            (item) => item.references.length >= state.hotspotThreshold,
          ).length
        }
        sortLabel={state.sortLabel}
        focusedSecretRequest={state.focusedSecretRequest}
        clearFocusedRequest={() => state.setFocusedSecretRequest(null)}
        secretKindGroups={state.secretKindGroups}
        secretStorageGroups={state.secretStorageGroups}
        topReferencedRequests={state.topReferencedRequests}
        topReferencedSecrets={state.topReferencedSecrets}
        topReferencedRequestPaths={state.topReferencedRequestPaths}
        onFocusRequest={(requestId, requestName) =>
          state.setFocusedSecretRequest({ requestId, requestName, nodePath: null })
        }
        onFocusRequestPath={(requestId, requestName, nodePath) =>
          state.setFocusedSecretRequest({ requestId, requestName, nodePath })
        }
        onOpenRequest={onSelectSecretRequest}
        onExpandSecret={state.setExpandedSecretId}
        hotspotThreshold={state.hotspotThreshold}
      />
      <WorkspaceSecretAuditList
        referencedSecretItems={state.referencedSecretItems}
        orphanSecretItems={state.orphanSecretItems}
        expandedSecretId={state.expandedSecretId}
        isDeleting={isDeletingSecret}
        onDelete={onDelete}
        onSelectRequest={onSelectSecretRequest}
        onToggle={state.toggleExpandedSecret}
      />
    </>
  );
}
