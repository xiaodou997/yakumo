import { useMemo } from "react";
import type { YakuGrpcMethodDefinition } from "../../lib/yaku-client";
import { useGrpcMessageEditorActions } from "./useGrpcMessageEditorActions";
import { useGrpcMessageEditorDerivedState } from "./useGrpcMessageEditorDerivedState";

export function useGrpcMessageEditorState({
  selectedDiscoveredMethod,
  selectedMethodShape,
  grpcMessage,
  setGrpcMessage,
}: {
  selectedDiscoveredMethod: YakuGrpcMethodDefinition | null;
  selectedMethodShape: "unary" | "streaming" | null;
  grpcMessage: string;
  setGrpcMessage: (value: string) => void;
}) {
  const derivedState = useGrpcMessageEditorDerivedState({
    selectedDiscoveredMethod,
    grpcMessage,
  });
  const messageEditorActions = useGrpcMessageEditorActions({
    selectedMethodShape,
    selectedMethodTemplate: derivedState.selectedMethodTemplate,
    selectedMethodTemplateText: derivedState.selectedMethodTemplateText,
    selectedMethodName: selectedDiscoveredMethod?.name,
    grpcMessage,
    setGrpcMessage,
  });
  const recentChangedPathSet = useMemo(
    () =>
      new Set(messageEditorActions.lastFillSummary?.entries.map((entry) => entry.path) ?? []),
    [messageEditorActions.lastFillSummary],
  );
  const recentChangedContainerPaths = useMemo(
    () => [...recentChangedPathSet],
    [recentChangedPathSet],
  );

  return {
    ...derivedState,
    ...messageEditorActions,
    recentChangedPathSet,
    recentChangedContainerPaths,
  };
}
