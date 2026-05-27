import { useMemo, useState } from "react";
import type { YakuSecretAudit } from "../../lib/yaku-client";
import {
  countSecretFacetGroups,
  describeSecretFilters,
  describeSecretSort,
  groupSecretReferencesByRequest,
  groupSecretReferencesByRequestPath,
  listSecretFacetOptions,
  matchesSecretSearch,
  SECRET_HOTSPOT_REFERENCE_COUNT,
  sortSecretItems,
} from "./WorkspaceSecretAuditModel";

export function useWorkspaceSecretAuditState(secretAudit: YakuSecretAudit | undefined) {
  const [expandedSecretId, setExpandedSecretId] = useState("");
  const [secretKindFilter, setSecretKindFilter] = useState("__all__");
  const [secretStorageFilter, setSecretStorageFilter] = useState("__all__");
  const [secretOrphanOnly, setSecretOrphanOnly] = useState(false);
  const [secretHotspotsOnly, setSecretHotspotsOnly] = useState(false);
  const [secretSearch, setSecretSearch] = useState("");
  const [secretSort, setSecretSort] = useState("orphans_first");
  const [focusedSecretRequest, setFocusedSecretRequest] = useState<{
    requestId: string;
    requestName: string;
    nodePath: string | null;
  } | null>(null);

  const secretKindOptions = useMemo(
    () => [
      { label: "All Kinds", value: "__all__" },
      ...listSecretFacetOptions(secretAudit?.items ?? [], "kind", "Unknown Kind"),
    ],
    [secretAudit?.items],
  );
  const secretStorageOptions = useMemo(
    () => [
      { label: "All Storage", value: "__all__" },
      ...listSecretFacetOptions(secretAudit?.items ?? [], "storage", "Unknown Storage"),
    ],
    [secretAudit?.items],
  );
  const filteredSecretItems = useMemo(() => {
    const items = secretAudit?.items ?? [];
    const normalizedSearch = secretSearch.trim().toLowerCase();
    return items.filter((item) => {
      if (secretOrphanOnly && !item.orphan) {
        return false;
      }
      const itemKind = item.kind ?? "__unknown__";
      if (secretKindFilter !== "__all__" && itemKind !== secretKindFilter) {
        return false;
      }
      const itemStorage = item.storage ?? "__unknown__";
      if (secretStorageFilter !== "__all__" && itemStorage !== secretStorageFilter) {
        return false;
      }
      if (secretHotspotsOnly && item.references.length < SECRET_HOTSPOT_REFERENCE_COUNT) {
        return false;
      }
      if (normalizedSearch !== "" && !matchesSecretSearch(item, normalizedSearch)) {
        return false;
      }
      if (
        focusedSecretRequest != null &&
        !item.references.some(
          (reference) =>
            reference.requestId === focusedSecretRequest.requestId &&
            (focusedSecretRequest.nodePath == null ||
              reference.nodePath === focusedSecretRequest.nodePath),
        )
      ) {
        return false;
      }
      return true;
    });
  }, [
    focusedSecretRequest,
    secretAudit?.items,
    secretHotspotsOnly,
    secretKindFilter,
    secretOrphanOnly,
    secretSearch,
    secretStorageFilter,
  ]);
  const sortedSecretItems = useMemo(
    () => sortSecretItems(filteredSecretItems, secretSort),
    [filteredSecretItems, secretSort],
  );
  const referencedSecretItems = sortedSecretItems.filter((item) => !item.orphan);
  const orphanSecretItems = sortedSecretItems.filter((item) => item.orphan);
  const hasActiveSecretFilters =
    secretKindFilter !== "__all__" ||
    secretStorageFilter !== "__all__" ||
    secretOrphanOnly ||
    secretHotspotsOnly ||
    secretSearch.trim() !== "" ||
    focusedSecretRequest != null ||
    secretSort !== "orphans_first";
  const secretKindGroups = useMemo(
    () => countSecretFacetGroups(filteredSecretItems, "kind", "unknown kind"),
    [filteredSecretItems],
  );
  const secretStorageGroups = useMemo(
    () => countSecretFacetGroups(filteredSecretItems, "storage", "unknown storage"),
    [filteredSecretItems],
  );
  const topReferencedSecrets = useMemo(
    () =>
      [...referencedSecretItems]
        .sort((left, right) => right.references.length - left.references.length)
        .slice(0, 5),
    [referencedSecretItems],
  );
  const topReferencedRequests = useMemo(
    () => groupSecretReferencesByRequest(filteredSecretItems).slice(0, 5),
    [filteredSecretItems],
  );
  const topReferencedRequestPaths = useMemo(
    () => groupSecretReferencesByRequestPath(filteredSecretItems).slice(0, 5),
    [filteredSecretItems],
  );
  const sortLabel = describeSecretSort(secretSort);
  const activeSecretFilterSummary = describeSecretFilters({
    focusedRequest: focusedSecretRequest,
    kind: secretKindFilter,
    storage: secretStorageFilter,
    orphanOnly: secretOrphanOnly,
  });

  const resetFilters = () => {
    setSecretKindFilter("__all__");
    setSecretStorageFilter("__all__");
    setSecretOrphanOnly(false);
    setSecretHotspotsOnly(false);
    setSecretSearch("");
    setSecretSort("orphans_first");
    setFocusedSecretRequest(null);
  };

  const toggleExpandedSecret = (secretId: string) => {
    setExpandedSecretId((current) => (current === secretId ? "" : secretId));
  };

  return {
    expandedSecretId,
    setExpandedSecretId,
    secretKindFilter,
    setSecretKindFilter,
    secretStorageFilter,
    setSecretStorageFilter,
    secretOrphanOnly,
    setSecretOrphanOnly,
    secretHotspotsOnly,
    setSecretHotspotsOnly,
    secretSearch,
    setSecretSearch,
    secretSort,
    setSecretSort,
    focusedSecretRequest,
    setFocusedSecretRequest,
    secretKindOptions,
    secretStorageOptions,
    filteredSecretItems,
    referencedSecretItems,
    orphanSecretItems,
    hasActiveSecretFilters,
    secretKindGroups,
    secretStorageGroups,
    topReferencedSecrets,
    topReferencedRequests,
    topReferencedRequestPaths,
    activeSecretFilterSummary,
    sortLabel,
    hotspotThreshold: SECRET_HOTSPOT_REFERENCE_COUNT,
    resetFilters,
    toggleExpandedSecret,
  };
}

export type ReturnTypeOfUseWorkspaceSecretAuditState = ReturnType<
  typeof useWorkspaceSecretAuditState
>;
