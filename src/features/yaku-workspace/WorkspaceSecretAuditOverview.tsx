import { VStack } from "../../components/core/Stacks";
import type { YakuSecretAuditItem } from "../../lib/yaku-client";
import { WorkspaceSecretAuditFilters } from "./WorkspaceSecretAuditFilters";
import { WorkspaceSecretAuditInsights } from "./WorkspaceSecretAuditInsights";
import { WorkspaceSecretAuditTopReferences } from "./WorkspaceSecretAuditTopReferences";

export function WorkspaceSecretAuditOverview({
  totalCount,
  filteredCount,
  secretKindFilter,
  setSecretKindFilter,
  secretStorageFilter,
  setSecretStorageFilter,
  secretKindOptions,
  secretStorageOptions,
  secretOrphanOnly,
  setSecretOrphanOnly,
  secretHotspotsOnly,
  setSecretHotspotsOnly,
  secretSearch,
  setSecretSearch,
  secretSort,
  setSecretSort,
  hasActiveSecretFilters,
  onReset,
  activeSecretFilterSummary,
  referencedCount,
  orphanCount,
  hotspotCount,
  sortLabel,
  focusedSecretRequest,
  clearFocusedRequest,
  secretKindGroups,
  secretStorageGroups,
  topReferencedRequests,
  topReferencedSecrets,
  topReferencedRequestPaths,
  onFocusRequest,
  onFocusRequestPath,
  onOpenRequest,
  onExpandSecret,
  hotspotThreshold,
}: {
  totalCount: number;
  filteredCount: number;
  secretKindFilter: string;
  setSecretKindFilter: (value: string) => void;
  secretStorageFilter: string;
  setSecretStorageFilter: (value: string) => void;
  secretKindOptions: Array<{ label: string; value: string }>;
  secretStorageOptions: Array<{ label: string; value: string }>;
  secretOrphanOnly: boolean;
  setSecretOrphanOnly: (value: boolean) => void;
  secretHotspotsOnly: boolean;
  setSecretHotspotsOnly: (value: boolean) => void;
  secretSearch: string;
  setSecretSearch: (value: string) => void;
  secretSort: string;
  setSecretSort: (value: string) => void;
  hasActiveSecretFilters: boolean;
  onReset: () => void;
  activeSecretFilterSummary: string | null;
  referencedCount: number;
  orphanCount: number;
  hotspotCount: number;
  sortLabel: string;
  focusedSecretRequest: { requestId: string; requestName: string; nodePath: string | null } | null;
  clearFocusedRequest: () => void;
  secretKindGroups: Array<{ label: string; count: number }>;
  secretStorageGroups: Array<{ label: string; count: number }>;
  topReferencedRequests: Array<{
    requestId: string;
    requestName: string;
    referenceCount: number;
    secretCount: number;
  }>;
  topReferencedSecrets: YakuSecretAuditItem[];
  topReferencedRequestPaths: Array<{
    requestId: string;
    requestName: string;
    nodePath: string;
    referenceCount: number;
  }>;
  onFocusRequest: (requestId: string, requestName: string) => void;
  onFocusRequestPath: (requestId: string, requestName: string, nodePath: string) => void;
  onOpenRequest: (requestId: string) => void;
  onExpandSecret: (secretId: string) => void;
  hotspotThreshold: number;
}) {
  return (
    <VStack space={2}>
      <WorkspaceSecretAuditFilters
        totalCount={totalCount}
        filteredCount={filteredCount}
        secretKindFilter={secretKindFilter}
        setSecretKindFilter={setSecretKindFilter}
        secretStorageFilter={secretStorageFilter}
        setSecretStorageFilter={setSecretStorageFilter}
        secretKindOptions={secretKindOptions}
        secretStorageOptions={secretStorageOptions}
        secretOrphanOnly={secretOrphanOnly}
        setSecretOrphanOnly={setSecretOrphanOnly}
        secretHotspotsOnly={secretHotspotsOnly}
        setSecretHotspotsOnly={setSecretHotspotsOnly}
        secretSearch={secretSearch}
        setSecretSearch={setSecretSearch}
        secretSort={secretSort}
        setSecretSort={setSecretSort}
        hasActiveSecretFilters={hasActiveSecretFilters}
        onReset={onReset}
        hotspotThreshold={hotspotThreshold}
      />
      <WorkspaceSecretAuditInsights
        activeSecretFilterSummary={activeSecretFilterSummary}
        referencedCount={referencedCount}
        orphanCount={orphanCount}
        hotspotCount={hotspotCount}
        hotspotThreshold={hotspotThreshold}
        sortLabel={sortLabel}
        focusedSecretRequest={focusedSecretRequest}
        clearFocusedRequest={clearFocusedRequest}
        secretKindGroups={secretKindGroups}
        secretStorageGroups={secretStorageGroups}
      />
      <WorkspaceSecretAuditTopReferences
        topReferencedRequests={topReferencedRequests}
        topReferencedSecrets={topReferencedSecrets}
        topReferencedRequestPaths={topReferencedRequestPaths}
        onFocusRequest={onFocusRequest}
        onFocusRequestPath={onFocusRequestPath}
        onOpenRequest={onOpenRequest}
        onExpandSecret={onExpandSecret}
      />
    </VStack>
  );
}
