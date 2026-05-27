import { useMemo } from "react";
import type { GrpcSchemaFieldEntry } from "./RequestGrpcSchemaTypes";

export function useGrpcSchemaNavigatorCountsState({
  selectedMethodFields,
}: {
  selectedMethodFields: GrpcSchemaFieldEntry[];
}) {
  const selectedMethodContainerFieldCount = useMemo(
    () => selectedMethodFields.filter((field) => field.isContainer).length,
    [selectedMethodFields],
  );
  const selectedMethodFilledFieldCount = useMemo(
    () => selectedMethodFields.filter((field) => field.messageState === "filled").length,
    [selectedMethodFields],
  );
  const selectedMethodPartialFieldCount = useMemo(
    () => selectedMethodFields.filter((field) => field.messageState === "partial").length,
    [selectedMethodFields],
  );
  const selectedMethodMissingFieldCount = useMemo(
    () => selectedMethodFields.filter((field) => field.messageState === "missing").length,
    [selectedMethodFields],
  );
  const selectedMethodMissingRequiredFields = useMemo(
    () =>
      selectedMethodFields
        .filter((field) => field.required && field.messageState !== "filled")
        .sort((left, right) => left.depth - right.depth),
    [selectedMethodFields],
  );

  return {
    selectedMethodContainerFieldCount,
    selectedMethodFilledFieldCount,
    selectedMethodPartialFieldCount,
    selectedMethodMissingFieldCount,
    selectedMethodMissingRequiredFields,
  };
}
