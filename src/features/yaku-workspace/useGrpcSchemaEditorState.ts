import type { YakuGrpcMethodDefinition } from "../../lib/yaku-client";
import {
  defaultExpandedGrpcSchemaPaths,
  grpcSchemaAncestorPaths,
  mergeUniqueStrings,
} from "./RequestGrpcSchemaModel";
import type { GrpcSchemaFieldEntry } from "./RequestGrpcSchemaTypes";
import { useGrpcMessageEditorState } from "./useGrpcMessageEditorState";
import { useGrpcSchemaNavigatorState } from "./useGrpcSchemaNavigatorState";

export function useGrpcSchemaEditorState({
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
  const messageEditor = useGrpcMessageEditorState({
    selectedDiscoveredMethod,
    selectedMethodShape,
    grpcMessage,
    setGrpcMessage,
  });
  const schemaNavigator = useGrpcSchemaNavigatorState({
    selectedDiscoveredMethod,
    grpcMessage,
    recentChangedPathSet: messageEditor.recentChangedPathSet,
    lastFillSummary: messageEditor.lastFillSummary,
  });

  const fillFieldsAndReveal = (
    fields: GrpcSchemaFieldEntry[],
    label: string,
  ) => {
    const result = messageEditor.fillRequiredFields(fields, label);
    if (!result.ok) {
      return result;
    }
    schemaNavigator.setExpandedSchemaPaths((current) =>
      mergeUniqueStrings([
        ...current,
        ...fields.flatMap((field) => [...grpcSchemaAncestorPaths(field.path), field.path]),
      ]),
    );
    schemaNavigator.setSchemaRequiredOnly(true);
    schemaNavigator.setSchemaUnfilledOnly(true);
    schemaNavigator.setSchemaRecentChangesOnly(true);
    return result;
  };

  const fillMissingRequiredFields = () =>
    fillFieldsAndReveal(schemaNavigator.selectedMethodMissingRequiredFields, "missing required");

  const fillSelectedRequiredFields = () =>
    fillFieldsAndReveal(schemaNavigator.selectedMissingRequiredFields, "selected required");

  const reviewMissingRequiredFields = () => {
    schemaNavigator.setSchemaFieldFilter("");
    schemaNavigator.setSchemaRequiredOnly(true);
    schemaNavigator.setSchemaContainersOnly(false);
    schemaNavigator.setSchemaUnfilledOnly(true);
    schemaNavigator.setSchemaRecentChangesOnly(false);
    schemaNavigator.setSchemaChangedContainersOnly(false);
    schemaNavigator.setExpandedSchemaPaths((current) =>
      mergeUniqueStrings([
        ...current,
        ...schemaNavigator.selectedMethodMissingRequiredFields.flatMap((field) => [
          ...grpcSchemaAncestorPaths(field.path),
          field.path,
        ]),
      ]),
    );
  };

  const reviewRecentChanges = () => {
    const summary = messageEditor.lastFillSummary;
    if (summary == null) {
      return;
    }
    schemaNavigator.setSchemaFieldFilter("");
    schemaNavigator.setSchemaRequiredOnly(false);
    schemaNavigator.setSchemaContainersOnly(false);
    schemaNavigator.setSchemaUnfilledOnly(false);
    schemaNavigator.setSchemaRecentChangesOnly(true);
    schemaNavigator.setSchemaChangedContainersOnly(false);
    schemaNavigator.setExpandedSchemaPaths((current) =>
      mergeUniqueStrings([
        ...current,
        ...summary.entries.flatMap((entry) => [
          ...grpcSchemaAncestorPaths(entry.path),
          entry.path,
        ]),
      ]),
    );
  };

  const reviewChangedContainers = () => {
    if (messageEditor.recentChangedContainerPaths.length === 0) {
      return;
    }
    schemaNavigator.setSchemaFieldFilter("");
    schemaNavigator.setSchemaRequiredOnly(false);
    schemaNavigator.setSchemaContainersOnly(false);
    schemaNavigator.setSchemaUnfilledOnly(false);
    schemaNavigator.setSchemaRecentChangesOnly(true);
    schemaNavigator.setSchemaChangedContainersOnly(true);
    schemaNavigator.setExpandedSchemaPaths((current) =>
      mergeUniqueStrings([
        ...current,
        ...messageEditor.recentChangedContainerPaths.flatMap((path) => [
          ...grpcSchemaAncestorPaths(path),
          path,
        ]),
      ]),
    );
  };

  const insertGrpcField = (
    field: Parameters<typeof messageEditor.insertGrpcField>[0],
  ) => {
    const result = messageEditor.insertGrpcField(field);
    if (!result.ok) {
      return result;
    }
    schemaNavigator.setExpandedSchemaPaths((current) =>
      mergeUniqueStrings([...current, ...grpcSchemaAncestorPaths(field.path), field.path]),
    );
    return result;
  };

  const insertGrpcBranch = (
    field: Parameters<typeof messageEditor.insertGrpcBranch>[0],
  ) => {
    const result = messageEditor.insertGrpcBranch(field);
    if (!result.ok) {
      return result;
    }
    schemaNavigator.setExpandedSchemaPaths((current) =>
      mergeUniqueStrings([...current, ...grpcSchemaAncestorPaths(field.path), field.path]),
    );
    return result;
  };

  return {
    ...schemaNavigator,
    ...messageEditor,
    fillMissingRequiredFields,
    fillSelectedRequiredFields,
    reviewMissingRequiredFields,
    reviewRecentChanges,
    reviewChangedContainers,
    insertGrpcField,
    insertGrpcBranch,
    collapseSchemaTree: () =>
      schemaNavigator.setExpandedSchemaPaths(
        defaultExpandedGrpcSchemaPaths(schemaNavigator.selectedMethodFields),
      ),
  };
}
