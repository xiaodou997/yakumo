import type { GrpcSchemaFieldEntry } from "./RequestGrpcSchemaTypes";

export function filterGrpcSchemaFields(
  fields: GrpcSchemaFieldEntry[],
  filterText: string,
  requiredOnly: boolean,
  containersOnly: boolean,
  unfilledOnly: boolean,
  recentChangesOnly: boolean,
  changedContainersOnly: boolean,
  recentChangedRelatedPathSet: Set<string>,
) {
  const query = filterText.trim().toLowerCase();
  return fields.filter(
    (field) =>
      (!requiredOnly || field.required) &&
      (!containersOnly || field.isContainer) &&
      (!unfilledOnly ||
        (field.required && field.messageState !== "filled")) &&
      (!recentChangesOnly || recentChangedRelatedPathSet.has(field.path)) &&
      (!changedContainersOnly ||
        (field.isContainer && recentChangedRelatedPathSet.has(field.path))) &&
      (query === "" ||
        field.path.toLowerCase().includes(query) ||
        field.displayName.toLowerCase().includes(query) ||
        field.kind.toLowerCase().includes(query) ||
        field.examplePreview.toLowerCase().includes(query)),
  );
}

export function visibleGrpcSchemaFields(
  fields: GrpcSchemaFieldEntry[],
  expandedPaths: string[],
  disableCollapse: boolean,
) {
  if (disableCollapse) {
    return fields;
  }
  const expanded = new Set(expandedPaths);
  return fields.filter((field) =>
    grpcSchemaAncestorPaths(field.path).every((ancestor) => expanded.has(ancestor)),
  );
}

export function grpcSchemaAncestorPaths(path: string) {
  const segments = path.split(".").filter((segment) => segment !== "");
  const ancestors: string[] = [];
  for (let index = 0; index < segments.length - 1; index += 1) {
    ancestors.push(segments.slice(0, index + 1).join("."));
  }
  return ancestors;
}

export function defaultExpandedGrpcSchemaPaths(fields: GrpcSchemaFieldEntry[]) {
  return fields
    .filter((field) => field.isContainer && field.depth === 0)
    .map((field) => field.path);
}

export function mergeUniqueStrings(values: string[]) {
  return [...new Set(values)];
}
