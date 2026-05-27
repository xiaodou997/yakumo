import type { GrpcSchemaFieldEntry } from "./RequestGrpcSchemaTypes";
import { resolveGrpcSchemaFieldState } from "./RequestGrpcSchemaFieldStateModel";

export function annotateGrpcSchemaFieldStates(
  fields: GrpcSchemaFieldEntry[],
  messageValue: Record<string, unknown> | null,
) {
  return fields.map((field) => ({
    ...field,
    messageState: resolveGrpcSchemaFieldState(messageValue, field.path),
  }));
}

export function withGrpcSchemaChildCounts(fields: GrpcSchemaFieldEntry[]) {
  return fields.map((field) => ({
    ...field,
    childCount: fields.filter(
      (candidate) =>
        candidate.path !== field.path &&
        candidate.path.startsWith(`${field.path}.`),
    ).length,
  }));
}
