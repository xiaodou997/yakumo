import type { RequestGrpcMessageSectionProps } from "./RequestGrpcTypes";
import type { useGrpcDiscoveryState } from "./useGrpcDiscoveryState";
import type { useGrpcSchemaEditorState } from "./useGrpcSchemaEditorState";

type DiscoveryState = ReturnType<typeof useGrpcDiscoveryState>;
type SchemaState = ReturnType<typeof useGrpcSchemaEditorState>;

export function buildGrpcMessageProps({
  grpcMessage,
  setGrpcMessage,
  discoveryState,
  schemaState,
}: {
  grpcMessage: string;
  setGrpcMessage: (value: string) => void;
  discoveryState: DiscoveryState;
  schemaState: SchemaState;
}): RequestGrpcMessageSectionProps {
  return {
    grpcMessage,
    setGrpcMessage,
    grpcMessageValidation: schemaState.grpcMessageValidation,
    selectedMethodTemplate: schemaState.selectedMethodTemplate,
    selectedMethodShape: discoveryState.selectedMethodShape,
    selectedMethodMissingRequiredFieldsCount:
      schemaState.selectedMethodMissingRequiredFields.length,
    selectedMissingRequiredFieldsCount: schemaState.selectedMissingRequiredFields.length,
    recentChangedContainerPaths: schemaState.recentChangedContainerPaths,
    lastInsertedFieldPath: schemaState.lastInsertedFieldPath,
    lastFillSummary: schemaState.lastFillSummary,
    messageEditorNotice: schemaState.messageEditorNotice,
    onFormatMessage: schemaState.formatGrpcMessage,
    onFillMissing: schemaState.mergeSelectedMethodTemplate,
    onFillMissingRequired: schemaState.fillMissingRequiredFields,
    onFillSelectedRequired: schemaState.fillSelectedRequiredFields,
    onReviewRequired: schemaState.reviewMissingRequiredFields,
    onReviewChanges: schemaState.reviewRecentChanges,
    onReviewChangedContainers: schemaState.reviewChangedContainers,
    onLocateInsertedField: () =>
      schemaState.focusSchemaPath(schemaState.lastInsertedFieldPath, {
        requiredOnly: false,
        unfilledOnly: false,
        recentChangesOnly: false,
        changedContainersOnly: false,
      }),
    onClearInsertedField: () => schemaState.setLastInsertedFieldPath(""),
    onLocateFillSummaryPath: (path) =>
      schemaState.focusSchemaPath(path, {
        requiredOnly: false,
        unfilledOnly: false,
        recentChangesOnly: false,
        changedContainersOnly: false,
      }),
    onFocusChangedContainer: (path) =>
      schemaState.focusSchemaPath(path, {
        fieldFilter: "",
        requiredOnly: false,
        unfilledOnly: false,
        recentChangesOnly: true,
        changedContainersOnly: true,
      }),
  };
}
