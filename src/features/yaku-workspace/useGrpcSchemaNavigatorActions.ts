import type { GrpcSchemaFieldEntry } from "./RequestGrpcSchemaTypes";
import type { GrpcFillSummary } from "./RequestGrpcTypes";
import { useGrpcSchemaNavigatorFilterState } from "./useGrpcSchemaNavigatorFilterState";
import { useGrpcSchemaNavigatorReviewState } from "./useGrpcSchemaNavigatorReviewState";
import { useGrpcSchemaNavigatorSelectionState } from "./useGrpcSchemaNavigatorSelectionState";

export function useGrpcSchemaNavigatorActions({
  selectedMethodFields,
  selectedMethodMissingRequiredFields,
  recentChangedContainerPaths,
  lastFillSummary,
}: {
  selectedMethodFields: GrpcSchemaFieldEntry[];
  selectedMethodMissingRequiredFields: GrpcSchemaFieldEntry[];
  recentChangedContainerPaths: string[];
  lastFillSummary: GrpcFillSummary | null;
}) {
  const filterState = useGrpcSchemaNavigatorFilterState({ selectedMethodFields });
  const selectionState = useGrpcSchemaNavigatorSelectionState({
    selectedMethodFields,
    selectedMethodMissingRequiredFields,
  });
  const reviewState = useGrpcSchemaNavigatorReviewState({
    filterState,
    selectedMethodMissingRequiredFields,
    recentChangedContainerPaths,
    lastFillSummary,
  });

  return {
    ...filterState,
    ...selectionState,
    ...reviewState,
  };
}
