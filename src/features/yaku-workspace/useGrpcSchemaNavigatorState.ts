import type { YakuGrpcMethodDefinition } from "../../lib/yaku-client";
import type { GrpcFillSummary } from "./RequestGrpcTypes";
import { useGrpcSchemaNavigatorActions } from "./useGrpcSchemaNavigatorActions";
import { useGrpcSchemaNavigatorDerivedState } from "./useGrpcSchemaNavigatorDerivedState";

export function useGrpcSchemaNavigatorState({
  selectedDiscoveredMethod,
  grpcMessage,
  recentChangedPathSet,
  lastFillSummary,
}: {
  selectedDiscoveredMethod: YakuGrpcMethodDefinition | null;
  grpcMessage: string;
  recentChangedPathSet: Set<string>;
  lastFillSummary: GrpcFillSummary | null;
}) {
  const derivedState = useGrpcSchemaNavigatorDerivedState({
    selectedDiscoveredMethod,
    grpcMessage,
    recentChangedPathSet,
  });
  const actionState = useGrpcSchemaNavigatorActions({
    selectedMethodFields: derivedState.selectedMethodFields,
    selectedMethodMissingRequiredFields: derivedState.selectedMethodMissingRequiredFields,
    recentChangedContainerPaths: derivedState.recentChangedContainerPaths,
    lastFillSummary,
  });

  return {
    ...derivedState,
    ...actionState,
  };
}

export type GrpcSchemaNavigatorState = ReturnType<
  typeof useGrpcSchemaNavigatorState
>;
