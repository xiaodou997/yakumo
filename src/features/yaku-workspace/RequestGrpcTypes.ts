import type {
  YakuGrpcMethodDefinition,
  YakuGrpcServiceDefinition,
} from "../../lib/yaku-client";
import type { GrpcSchemaFieldEntry } from "./RequestGrpcSchemaTypes";

export type GrpcFillSummary = {
  title: string;
  entries: Array<{
    path: string;
    previousState: "partial" | "missing";
  }>;
};

export type GrpcMessageEditorNotice = {
  tone: "success" | "danger";
  message: string;
};

export type RequestGrpcDiscoveryPanelProps = {
  grpcUseReflection: boolean;
  canDiscover: boolean;
  discoveryRevision: number;
  isDiscovering: boolean;
  discoveryError: string | null;
  discoveredServices: YakuGrpcServiceDefinition[];
  filteredServices: YakuGrpcServiceDefinition[];
  grpcService: string;
  setGrpcService: (value: string) => void;
  grpcMethod: string;
  setGrpcMethod: (value: string) => void;
  serviceFilter: string;
  setServiceFilter: (value: string) => void;
  serviceOptions: Array<{ label: string; value: string }>;
  methodOptions: Array<{ label: string; value: string }>;
  fallbackServiceName: string;
  fallbackMethodValue: string;
  selectedDiscoveredService: YakuGrpcServiceDefinition | null;
  onDiscover: () => void;
  onSelectDiscoveredService: (value: string) => void;
  onSelectDiscoveredMethod: (value: string) => void;
  onFocusService: (serviceName: string) => void;
  onApplyDiscoveredMethod: (
    service: YakuGrpcServiceDefinition,
    method: YakuGrpcMethodDefinition,
  ) => void;
};

export type RequestGrpcSchemaNavigatorSectionProps = {
  visibleSelectedMethodFields: GrpcSchemaFieldEntry[];
  filteredSelectedMethodFields: GrpcSchemaFieldEntry[];
  selectedMethodFields: GrpcSchemaFieldEntry[];
  selectedMethodContainerFieldCount: number;
  selectedMethodFilledFieldCount: number;
  selectedMethodPartialFieldCount: number;
  selectedMethodMissingFieldCount: number;
  schemaFieldFilter: string;
  setSchemaFieldFilter: (value: string) => void;
  schemaRequiredOnly: boolean;
  setSchemaRequiredOnly: (value: boolean) => void;
  schemaContainersOnly: boolean;
  setSchemaContainersOnly: (value: boolean) => void;
  schemaUnfilledOnly: boolean;
  setSchemaUnfilledOnly: (value: boolean) => void;
  schemaRecentChangesOnly: boolean;
  setSchemaRecentChangesOnly: (value: boolean) => void;
  schemaChangedContainersOnly: boolean;
  setSchemaChangedContainersOnly: (value: boolean) => void;
  expandedSchemaPaths: string[];
  recentChangedPathSet: Set<string>;
  lastInsertedFieldPath: string;
  selectedMethodShape: "unary" | "streaming" | null;
  onExpandAllSchemaFields: () => void;
  onCollapseSchemaTree: () => void;
  onToggleSchemaPath: (path: string) => void;
  onInsertGrpcBranch: (field: GrpcSchemaFieldEntry) => void;
  onInsertGrpcField: (field: GrpcSchemaFieldEntry) => void;
};

export type RequestGrpcSelectedMethodOverviewProps = {
  selectedMethodTemplate: unknown | null;
  selectedMethodShape: "unary" | "streaming" | null;
  selectedMethodTemplateFieldCount: number;
  selectedMethodSchemaLineCount: number;
};

export type RequestGrpcSelectedMethodRequiredFillProps = {
  selectedMethodMissingRequiredFields: GrpcSchemaFieldEntry[];
  selectedMissingRequiredFieldPaths: string[];
  selectedMissingRequiredFieldsCount: number;
  lastFillSummary: GrpcFillSummary | null;
  onFillMissingRequired: () => void;
  onSelectAllMissingRequired: () => void;
  onClearSelectedMissingRequired: () => void;
  onReviewRequired: () => void;
  onReviewChanges: () => void;
  onFillSelectedRequired: () => void;
  onToggleSelectedMissingRequiredFieldPath: (path: string) => void;
  onLocateMissingRequiredField: (path: string) => void;
};

export type RequestGrpcSelectedMethodSchemaPreviewProps = {
  selectedMethodTemplateText: string;
  schemaText: string;
};

export type RequestGrpcSelectedMethodPanelProps = {
  selectedDiscoveredService: YakuGrpcServiceDefinition | null;
  selectedDiscoveredMethod: YakuGrpcMethodDefinition | null;
  overview: RequestGrpcSelectedMethodOverviewProps;
  requiredFill: RequestGrpcSelectedMethodRequiredFillProps;
  schemaPreview: RequestGrpcSelectedMethodSchemaPreviewProps;
  schemaNavigator: RequestGrpcSchemaNavigatorSectionProps;
  onReplaceMessage: () => void;
  onFillMissing: () => void;
};

export type RequestGrpcBrowserSectionProps = {
  discovery: RequestGrpcDiscoveryPanelProps;
  selectedMethod: RequestGrpcSelectedMethodPanelProps | null;
};

export type RequestGrpcMessageSectionProps = {
  grpcMessage: string;
  setGrpcMessage: (value: string) => void;
  grpcMessageValidation: {
    label: string;
    topLevelKeys: number;
    description: string;
  };
  selectedMethodTemplate: unknown | null;
  selectedMethodShape: "unary" | "streaming" | null;
  selectedMethodMissingRequiredFieldsCount: number;
  selectedMissingRequiredFieldsCount: number;
  recentChangedContainerPaths: string[];
  lastInsertedFieldPath: string;
  lastFillSummary: GrpcFillSummary | null;
  messageEditorNotice: GrpcMessageEditorNotice | null;
  onFormatMessage: () => void;
  onFillMissing: () => void;
  onFillMissingRequired: () => void;
  onFillSelectedRequired: () => void;
  onReviewRequired: () => void;
  onReviewChanges: () => void;
  onReviewChangedContainers: () => void;
  onLocateInsertedField: () => void;
  onClearInsertedField: () => void;
  onLocateFillSummaryPath: (path: string) => void;
  onFocusChangedContainer: (path: string) => void;
};

export type RequestGrpcTransportSectionProps = {
  grpcMetadata: import("./types").ConfigPair[];
  setGrpcMetadata: (pairs: import("./types").ConfigPair[]) => void;
  grpcProtoImportRoots: string;
  setGrpcProtoImportRoots: (value: string) => void;
  grpcProtoFiles: string;
  setGrpcProtoFiles: (value: string) => void;
  grpcUseReflection: boolean;
  setGrpcUseReflection: (value: boolean) => void;
  timeoutMs: string;
  setTimeoutMs: (value: string) => void;
};
