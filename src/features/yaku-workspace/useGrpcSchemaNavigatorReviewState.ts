import {
  grpcSchemaAncestorPaths,
  mergeUniqueStrings,
} from "./RequestGrpcSchemaModel";
import type { GrpcSchemaFieldEntry } from "./RequestGrpcSchemaTypes";
import type { GrpcFillSummary } from "./RequestGrpcTypes";
import type { GrpcSchemaNavigatorFilterState } from "./useGrpcSchemaNavigatorFilterState";

function expandAndRevealPaths(
  filterState: GrpcSchemaNavigatorFilterState,
  paths: string[],
) {
  filterState.setExpandedSchemaPaths((current) =>
    mergeUniqueStrings([
      ...current,
      ...paths.flatMap((path) => [...grpcSchemaAncestorPaths(path), path]),
    ]),
  );
}

export function useGrpcSchemaNavigatorReviewState({
  filterState,
  selectedMethodMissingRequiredFields,
  recentChangedContainerPaths,
  lastFillSummary,
}: {
  filterState: GrpcSchemaNavigatorFilterState;
  selectedMethodMissingRequiredFields: GrpcSchemaFieldEntry[];
  recentChangedContainerPaths: string[];
  lastFillSummary: GrpcFillSummary | null;
}) {
  const reviewMissingRequiredFields = () => {
    filterState.setSchemaFieldFilter("");
    filterState.setSchemaRequiredOnly(true);
    filterState.setSchemaContainersOnly(false);
    filterState.setSchemaUnfilledOnly(true);
    filterState.setSchemaRecentChangesOnly(false);
    filterState.setSchemaChangedContainersOnly(false);
    expandAndRevealPaths(
      filterState,
      selectedMethodMissingRequiredFields.map((field) => field.path),
    );
  };

  const reviewRecentChanges = () => {
    if (lastFillSummary == null) {
      return;
    }
    filterState.setSchemaFieldFilter("");
    filterState.setSchemaRequiredOnly(false);
    filterState.setSchemaContainersOnly(false);
    filterState.setSchemaUnfilledOnly(false);
    filterState.setSchemaRecentChangesOnly(true);
    filterState.setSchemaChangedContainersOnly(false);
    expandAndRevealPaths(
      filterState,
      lastFillSummary.entries.map((entry) => entry.path),
    );
  };

  const reviewChangedContainers = () => {
    if (recentChangedContainerPaths.length === 0) {
      return;
    }
    filterState.setSchemaFieldFilter("");
    filterState.setSchemaRequiredOnly(false);
    filterState.setSchemaContainersOnly(false);
    filterState.setSchemaUnfilledOnly(false);
    filterState.setSchemaRecentChangesOnly(true);
    filterState.setSchemaChangedContainersOnly(true);
    expandAndRevealPaths(filterState, recentChangedContainerPaths);
  };

  return {
    reviewMissingRequiredFields,
    reviewRecentChanges,
    reviewChangedContainers,
  };
}
