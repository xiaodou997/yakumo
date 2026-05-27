import { useMemo } from "react";
import {
  defaultExpandedGrpcSchemaPaths,
  filterGrpcSchemaFields,
  grpcSchemaAncestorPaths,
  visibleGrpcSchemaFields,
} from "./RequestGrpcSchemaModel";
import type { GrpcSchemaFieldEntry } from "./RequestGrpcSchemaTypes";

export function useGrpcSchemaNavigatorVisibilityState({
  selectedMethodFields,
  recentChangedPathSet,
}: {
  selectedMethodFields: GrpcSchemaFieldEntry[];
  recentChangedPathSet: Set<string>;
}) {
  const recentChangedRelatedPathSet = useMemo(
    () =>
      new Set(
        [...recentChangedPathSet].flatMap((path) => [
          path,
          ...grpcSchemaAncestorPaths(path),
        ]),
      ),
    [recentChangedPathSet],
  );
  const filteredSelectedMethodFields = useMemo(
    () =>
      filterGrpcSchemaFields(
        selectedMethodFields,
        "",
        false,
        false,
        false,
        false,
        false,
        recentChangedRelatedPathSet,
      ),
    [recentChangedRelatedPathSet, selectedMethodFields],
  );
  const visibleSelectedMethodFields = useMemo(
    () =>
      visibleGrpcSchemaFields(
        filteredSelectedMethodFields,
        defaultExpandedGrpcSchemaPaths(selectedMethodFields),
        true,
      ),
    [filteredSelectedMethodFields, selectedMethodFields],
  );
  const recentChangedContainerPaths = useMemo(
    () =>
      selectedMethodFields
        .filter(
          (field) => field.isContainer && recentChangedRelatedPathSet.has(field.path),
        )
        .map((field) => field.path),
    [recentChangedRelatedPathSet, selectedMethodFields],
  );

  return {
    recentChangedRelatedPathSet,
    filteredSelectedMethodFields,
    visibleSelectedMethodFields,
    recentChangedContainerPaths,
  };
}
