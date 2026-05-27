import { useMemo } from "react";
import type { YakuGrpcMethodDefinition } from "../../lib/yaku-client";
import { parseGrpcMessageObject } from "./RequestGrpcMessageValidationModel";
import { buildGrpcSchemaFieldEntries } from "./RequestGrpcSchemaModel";

export function useGrpcSchemaNavigatorMessageState({
  selectedDiscoveredMethod,
  grpcMessage,
}: {
  selectedDiscoveredMethod: YakuGrpcMethodDefinition | null;
  grpcMessage: string;
}) {
  const parsedGrpcMessage = useMemo(
    () => parseGrpcMessageObject(grpcMessage),
    [grpcMessage],
  );
  const selectedMethodFields = useMemo(
    () =>
      selectedDiscoveredMethod == null
        ? []
        : buildGrpcSchemaFieldEntries(selectedDiscoveredMethod.schema, parsedGrpcMessage),
    [parsedGrpcMessage, selectedDiscoveredMethod],
  );

  return {
    parsedGrpcMessage,
    selectedMethodFields,
  };
}
