import type {
  RequestGrpcBrowserSectionProps,
  RequestGrpcDiscoveryPanelProps,
  RequestGrpcSchemaNavigatorSectionProps,
  RequestGrpcSelectedMethodPanelProps,
} from "./RequestGrpcTypes";
import type { useGrpcDiscoveryState } from "./useGrpcDiscoveryState";
import type { useGrpcSchemaEditorState } from "./useGrpcSchemaEditorState";

type DiscoveryState = ReturnType<typeof useGrpcDiscoveryState>;
type SchemaState = ReturnType<typeof useGrpcSchemaEditorState>;

export function buildGrpcBrowserProps({
  grpcUseReflection,
  grpcService,
  setGrpcService,
  grpcMethod,
  setGrpcMethod,
  discoveryState,
  schemaState,
}: {
  grpcUseReflection: boolean;
  grpcService: string;
  setGrpcService: (value: string) => void;
  grpcMethod: string;
  setGrpcMethod: (value: string) => void;
  discoveryState: DiscoveryState;
  schemaState: SchemaState;
}): RequestGrpcBrowserSectionProps {
  const discoveryProps: RequestGrpcDiscoveryPanelProps = {
    grpcUseReflection,
    canDiscover: discoveryState.canDiscover,
    discoveryRevision: discoveryState.discoveryRevision,
    isDiscovering: discoveryState.grpcServicesQuery.isFetching,
    discoveryError: discoveryState.grpcServicesQuery.isError
      ? String(discoveryState.grpcServicesQuery.error)
      : null,
    discoveredServices: discoveryState.discoveredServices,
    filteredServices: discoveryState.filteredServices,
    grpcService,
    setGrpcService,
    grpcMethod,
    setGrpcMethod,
    serviceFilter: discoveryState.serviceFilter,
    setServiceFilter: discoveryState.setServiceFilter,
    serviceOptions: discoveryState.serviceOptions,
    methodOptions: discoveryState.methodOptions,
    fallbackServiceName: discoveryState.fallbackServiceName,
    fallbackMethodValue: discoveryState.fallbackMethodValue,
    selectedDiscoveredService: discoveryState.selectedDiscoveredService,
    onDiscover: discoveryState.refreshDiscovery,
    onSelectDiscoveredService: discoveryState.selectDiscoveredService,
    onSelectDiscoveredMethod: discoveryState.selectDiscoveredMethod,
    onFocusService: discoveryState.focusService,
    onApplyDiscoveredMethod: discoveryState.applyDiscoveredMethod,
  };

  const schemaNavigatorProps: RequestGrpcSchemaNavigatorSectionProps = {
    visibleSelectedMethodFields: schemaState.visibleSelectedMethodFields,
    filteredSelectedMethodFields: schemaState.filteredSelectedMethodFields,
    selectedMethodFields: schemaState.selectedMethodFields,
    selectedMethodContainerFieldCount: schemaState.selectedMethodContainerFieldCount,
    selectedMethodFilledFieldCount: schemaState.selectedMethodFilledFieldCount,
    selectedMethodPartialFieldCount: schemaState.selectedMethodPartialFieldCount,
    selectedMethodMissingFieldCount: schemaState.selectedMethodMissingFieldCount,
    schemaFieldFilter: schemaState.schemaFieldFilter,
    setSchemaFieldFilter: schemaState.setSchemaFieldFilter,
    schemaRequiredOnly: schemaState.schemaRequiredOnly,
    setSchemaRequiredOnly: schemaState.setSchemaRequiredOnly,
    schemaContainersOnly: schemaState.schemaContainersOnly,
    setSchemaContainersOnly: schemaState.setSchemaContainersOnly,
    schemaUnfilledOnly: schemaState.schemaUnfilledOnly,
    setSchemaUnfilledOnly: schemaState.setSchemaUnfilledOnly,
    schemaRecentChangesOnly: schemaState.schemaRecentChangesOnly,
    setSchemaRecentChangesOnly: schemaState.setSchemaRecentChangesOnly,
    schemaChangedContainersOnly: schemaState.schemaChangedContainersOnly,
    setSchemaChangedContainersOnly: schemaState.setSchemaChangedContainersOnly,
    expandedSchemaPaths: schemaState.expandedSchemaPaths,
    recentChangedPathSet: schemaState.recentChangedPathSet,
    lastInsertedFieldPath: schemaState.lastInsertedFieldPath,
    selectedMethodShape: discoveryState.selectedMethodShape,
    onExpandAllSchemaFields: schemaState.expandAllSchemaFields,
    onCollapseSchemaTree: schemaState.collapseSchemaTree,
    onToggleSchemaPath: schemaState.toggleSchemaPath,
    onInsertGrpcBranch: schemaState.insertGrpcBranch,
    onInsertGrpcField: schemaState.insertGrpcField,
  };

  const selectedMethodProps: RequestGrpcSelectedMethodPanelProps | null =
    discoveryState.selectedDiscoveredService == null
      ? null
      : {
          selectedDiscoveredService: discoveryState.selectedDiscoveredService,
          selectedDiscoveredMethod: discoveryState.selectedDiscoveredMethod,
          overview: {
            selectedMethodTemplate: schemaState.selectedMethodTemplate,
            selectedMethodShape: discoveryState.selectedMethodShape,
            selectedMethodTemplateFieldCount: schemaState.selectedMethodTemplateFieldCount,
            selectedMethodSchemaLineCount: schemaState.selectedMethodSchemaLineCount,
          },
          requiredFill: {
            selectedMethodMissingRequiredFields:
              schemaState.selectedMethodMissingRequiredFields,
            selectedMissingRequiredFieldPaths:
              schemaState.selectedMissingRequiredFieldPaths,
            selectedMissingRequiredFieldsCount:
              schemaState.selectedMissingRequiredFields.length,
            lastFillSummary: schemaState.lastFillSummary,
            onFillMissingRequired: schemaState.fillMissingRequiredFields,
            onSelectAllMissingRequired: schemaState.selectAllMissingRequiredFields,
            onClearSelectedMissingRequired:
              schemaState.clearSelectedMissingRequiredFields,
            onReviewRequired: schemaState.reviewMissingRequiredFields,
            onReviewChanges: schemaState.reviewRecentChanges,
            onFillSelectedRequired: schemaState.fillSelectedRequiredFields,
            onToggleSelectedMissingRequiredFieldPath:
              schemaState.toggleSelectedMissingRequiredFieldPath,
            onLocateMissingRequiredField: (path) =>
              schemaState.focusSchemaPath(path, {
                requiredOnly: true,
                unfilledOnly: true,
                recentChangesOnly: false,
                changedContainersOnly: false,
              }),
          },
          schemaPreview: {
            selectedMethodTemplateText: schemaState.selectedMethodTemplateText,
            schemaText: discoveryState.selectedDiscoveredMethod?.schema ?? "",
          },
          schemaNavigator: schemaNavigatorProps,
          onReplaceMessage: schemaState.applySelectedMethodTemplate,
          onFillMissing: schemaState.mergeSelectedMethodTemplate,
        };

  return {
    discovery: discoveryProps,
    selectedMethod: selectedMethodProps,
  };
}
