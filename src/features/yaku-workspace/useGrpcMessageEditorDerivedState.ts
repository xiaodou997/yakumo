import { useMemo } from "react";
import type { YakuGrpcMethodDefinition } from "../../lib/yaku-client";
import {
  buildGrpcTemplateFromSchemaText,
  countGrpcTemplateFields,
  validateGrpcMessageText,
} from "./RequestGrpcSchemaModel";
export function useGrpcMessageEditorDerivedState({
  selectedDiscoveredMethod,
  grpcMessage,
}: {
  selectedDiscoveredMethod: YakuGrpcMethodDefinition | null;
  grpcMessage: string;
}) {
  const selectedMethodTemplate = useMemo(
    () =>
      selectedDiscoveredMethod == null
        ? null
        : buildGrpcTemplateFromSchemaText(selectedDiscoveredMethod.schema),
    [selectedDiscoveredMethod],
  );
  const selectedMethodTemplateText = useMemo(
    () =>
      selectedMethodTemplate == null
        ? "Unable to derive a template from this schema."
        : JSON.stringify(selectedMethodTemplate, null, 2),
    [selectedMethodTemplate],
  );
  const selectedMethodTemplateFieldCount = useMemo(
    () => countGrpcTemplateFields(selectedMethodTemplate),
    [selectedMethodTemplate],
  );
  const selectedMethodSchemaLineCount =
    selectedDiscoveredMethod?.schema.split(/\r?\n/).length ?? 0;
  const grpcMessageValidation = useMemo(
    () => validateGrpcMessageText(grpcMessage),
    [grpcMessage],
  );

  return {
    selectedMethodTemplate,
    selectedMethodTemplateText,
    selectedMethodTemplateFieldCount,
    selectedMethodSchemaLineCount,
    grpcMessageValidation,
  };
}
