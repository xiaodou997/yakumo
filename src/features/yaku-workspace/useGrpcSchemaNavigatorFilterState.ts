import { useEffect, useState } from "react";
import {
  defaultExpandedGrpcSchemaPaths,
  grpcSchemaAncestorPaths,
  mergeUniqueStrings,
} from "./RequestGrpcSchemaModel";
import type { GrpcSchemaFieldEntry } from "./RequestGrpcSchemaTypes";

export function useGrpcSchemaNavigatorFilterState({
  selectedMethodFields,
}: {
  selectedMethodFields: GrpcSchemaFieldEntry[];
}) {
  const [schemaFieldFilter, setSchemaFieldFilter] = useState("");
  const [schemaRequiredOnly, setSchemaRequiredOnly] = useState(false);
  const [schemaContainersOnly, setSchemaContainersOnly] = useState(false);
  const [schemaUnfilledOnly, setSchemaUnfilledOnly] = useState(false);
  const [schemaRecentChangesOnly, setSchemaRecentChangesOnly] = useState(false);
  const [schemaChangedContainersOnly, setSchemaChangedContainersOnly] = useState(false);
  const [expandedSchemaPaths, setExpandedSchemaPaths] = useState<string[]>([]);

  useEffect(() => {
    setSchemaFieldFilter("");
    setSchemaRequiredOnly(false);
    setSchemaContainersOnly(false);
    setSchemaUnfilledOnly(false);
    setSchemaRecentChangesOnly(false);
    setSchemaChangedContainersOnly(false);
    setExpandedSchemaPaths(defaultExpandedGrpcSchemaPaths(selectedMethodFields));
  }, [selectedMethodFields]);

  const focusSchemaPath = (
    path: string,
    {
      fieldFilter = path,
      requiredOnly,
      unfilledOnly,
      recentChangesOnly,
      changedContainersOnly,
    }: {
      fieldFilter?: string;
      requiredOnly: boolean;
      unfilledOnly: boolean;
      recentChangesOnly: boolean;
      changedContainersOnly: boolean;
    },
  ) => {
    setSchemaFieldFilter(fieldFilter);
    setSchemaRequiredOnly(requiredOnly);
    setSchemaContainersOnly(false);
    setSchemaUnfilledOnly(unfilledOnly);
    setSchemaRecentChangesOnly(recentChangesOnly);
    setSchemaChangedContainersOnly(changedContainersOnly);
    setExpandedSchemaPaths((current) =>
      mergeUniqueStrings([...current, ...grpcSchemaAncestorPaths(path), path]),
    );
  };

  const toggleSchemaPath = (path: string) => {
    setExpandedSchemaPaths((current) =>
      current.includes(path)
        ? current.filter((item) => item !== path)
        : [...current, path],
    );
  };

  const expandAllSchemaFields = () => {
    setExpandedSchemaPaths(
      selectedMethodFields.filter((field) => field.isContainer).map((field) => field.path),
    );
  };

  const collapseSchemaTree = () => {
    setExpandedSchemaPaths(defaultExpandedGrpcSchemaPaths(selectedMethodFields));
  };

  return {
    schemaFieldFilter,
    setSchemaFieldFilter,
    schemaRequiredOnly,
    setSchemaRequiredOnly,
    schemaContainersOnly,
    setSchemaContainersOnly,
    schemaUnfilledOnly,
    setSchemaUnfilledOnly,
    schemaRecentChangesOnly,
    setSchemaRecentChangesOnly,
    schemaChangedContainersOnly,
    setSchemaChangedContainersOnly,
    expandedSchemaPaths,
    setExpandedSchemaPaths,
    focusSchemaPath,
    toggleSchemaPath,
    expandAllSchemaFields,
    collapseSchemaTree,
  };
}

export type GrpcSchemaNavigatorFilterState = ReturnType<
  typeof useGrpcSchemaNavigatorFilterState
>;
