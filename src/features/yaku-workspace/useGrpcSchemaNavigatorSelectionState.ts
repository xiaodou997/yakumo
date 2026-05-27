import { useEffect, useMemo, useState } from "react";
import type { GrpcSchemaFieldEntry } from "./RequestGrpcSchemaTypes";

export function useGrpcSchemaNavigatorSelectionState({
  selectedMethodFields,
  selectedMethodMissingRequiredFields,
}: {
  selectedMethodFields: GrpcSchemaFieldEntry[];
  selectedMethodMissingRequiredFields: GrpcSchemaFieldEntry[];
}) {
  const [selectedMissingRequiredFieldPaths, setSelectedMissingRequiredFieldPaths] =
    useState<string[]>([]);

  useEffect(() => {
    setSelectedMissingRequiredFieldPaths([]);
  }, [selectedMethodFields]);

  useEffect(() => {
    setSelectedMissingRequiredFieldPaths((current) => {
      const validPaths = new Set(
        selectedMethodMissingRequiredFields.map((field) => field.path),
      );
      const kept = current.filter((path) => validPaths.has(path));
      const added = selectedMethodMissingRequiredFields
        .map((field) => field.path)
        .filter((path) => !kept.includes(path));
      return [...kept, ...added];
    });
  }, [selectedMethodMissingRequiredFields]);

  const selectedMissingRequiredFields = useMemo(
    () =>
      selectedMissingRequiredFieldPaths
        .map((path: string) =>
          selectedMethodMissingRequiredFields.find((field) => field.path === path),
        )
        .filter((field): field is GrpcSchemaFieldEntry => field != null),
    [selectedMissingRequiredFieldPaths, selectedMethodMissingRequiredFields],
  );

  const toggleSelectedMissingRequiredFieldPath = (path: string) => {
    setSelectedMissingRequiredFieldPaths((current) =>
      current.includes(path)
        ? current.filter((item) => item !== path)
        : [...current, path],
    );
  };

  const selectAllMissingRequiredFields = () => {
    setSelectedMissingRequiredFieldPaths(
      selectedMethodMissingRequiredFields.map((field) => field.path),
    );
  };

  const clearSelectedMissingRequiredFields = () => {
    setSelectedMissingRequiredFieldPaths([]);
  };

  return {
    selectedMissingRequiredFieldPaths,
    selectedMissingRequiredFields,
    toggleSelectedMissingRequiredFieldPath,
    selectAllMissingRequiredFields,
    clearSelectedMissingRequiredFields,
  };
}
