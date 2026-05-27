import { Button } from "../../components/core/Button";
import { HStack, VStack } from "../../components/core/Stacks";
import { SecretFacetSummary } from "./WorkspaceSecretAuditCards";
import { WorkspaceContextStatBlock } from "./WorkspaceContextShared";

export function WorkspaceSecretAuditInsights({
  activeSecretFilterSummary,
  referencedCount,
  orphanCount,
  hotspotCount,
  hotspotThreshold,
  sortLabel,
  focusedSecretRequest,
  clearFocusedRequest,
  secretKindGroups,
  secretStorageGroups,
}: {
  activeSecretFilterSummary: string | null;
  referencedCount: number;
  orphanCount: number;
  hotspotCount: number;
  hotspotThreshold: number;
  sortLabel: string;
  focusedSecretRequest: { requestId: string; requestName: string; nodePath: string | null } | null;
  clearFocusedRequest: () => void;
  secretKindGroups: Array<{ label: string; count: number }>;
  secretStorageGroups: Array<{ label: string; count: number }>;
}) {
  return (
    <>
      {activeSecretFilterSummary != null ? (
        <div className="text-[11px] text-text-subtle">Filters: {activeSecretFilterSummary}</div>
      ) : null}
      <div className="grid gap-2 md:grid-cols-3">
        <WorkspaceContextStatBlock label="Referenced" value={String(referencedCount)} />
        <WorkspaceContextStatBlock label="Orphans" value={String(orphanCount)} />
        <WorkspaceContextStatBlock
          label={`Hotspots ${hotspotThreshold}+`}
          value={String(hotspotCount)}
        />
      </div>
      <div className="text-[11px] text-text-subtle">Sort: {sortLabel}</div>
      {focusedSecretRequest != null ? (
        <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-2 py-2">
          <HStack justifyContent="between" alignItems="start" className="gap-2">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.18em] text-text-subtlest">
                Focused Request
              </div>
              <div className="mt-1 truncate text-[11px] text-text">
                {focusedSecretRequest.requestName}
              </div>
              <div className="truncate text-[10px] text-text-subtlest">
                {focusedSecretRequest.nodePath == null
                  ? "All secret references in request"
                  : focusedSecretRequest.nodePath}
              </div>
            </div>
            <Button size="2xs" type="button" variant="border" onClick={clearFocusedRequest}>
              Clear Focus
            </Button>
          </HStack>
        </div>
      ) : null}
      <div className="grid gap-2 md:grid-cols-2">
        <SecretFacetSummary title="Kind Groups" groups={secretKindGroups} />
        <SecretFacetSummary title="Storage Groups" groups={secretStorageGroups} />
      </div>
    </>
  );
}
