import type { YakuGrpcMethodDefinition } from "../../lib/yaku-client";
import { useGrpcSchemaNavigatorCountsState } from "./useGrpcSchemaNavigatorCountsState";
import { useGrpcSchemaNavigatorMessageState } from "./useGrpcSchemaNavigatorMessageState";
import { useGrpcSchemaNavigatorVisibilityState } from "./useGrpcSchemaNavigatorVisibilityState";

export function useGrpcSchemaNavigatorDerivedState({
  selectedDiscoveredMethod,
  grpcMessage,
  recentChangedPathSet,
}: {
  selectedDiscoveredMethod: YakuGrpcMethodDefinition | null;
  grpcMessage: string;
  recentChangedPathSet: Set<string>;
}) {
  const { parsedGrpcMessage, selectedMethodFields } =
    useGrpcSchemaNavigatorMessageState({
      selectedDiscoveredMethod,
      grpcMessage,
    });
  const countsState = useGrpcSchemaNavigatorCountsState({ selectedMethodFields });
  const visibilityState = useGrpcSchemaNavigatorVisibilityState({
    selectedMethodFields,
    recentChangedPathSet,
  });

  return {
    parsedGrpcMessage,
    selectedMethodFields,
    ...countsState,
    ...visibilityState,
  };
}
