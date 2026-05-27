import type { GrpcSchemaFieldEntry, JsonSchemaNode } from "./RequestGrpcSchemaTypes";
import {
  buildSchemaBranch,
  buildSchemaTemplate,
  resolveSchemaRef,
} from "./RequestGrpcSchemaTemplateModel";
import {
  annotateGrpcSchemaFieldStates,
  withGrpcSchemaChildCounts,
} from "./RequestGrpcSchemaFieldEntryDecorators";
import {
  buildGrpcSchemaEntryMetadata,
  formatGrpcSchemaExample,
} from "./RequestGrpcSchemaFieldEntryMetadata";

export function buildGrpcSchemaFieldEntries(
  schemaText: string,
  messageValue: Record<string, unknown> | null,
): GrpcSchemaFieldEntry[] {
  try {
    const root = JSON.parse(schemaText) as JsonSchemaNode;
    const entries: GrpcSchemaFieldEntry[] = [];
    collectGrpcSchemaFieldEntries(root, root, "", true, new Set<string>(), entries);
    return annotateGrpcSchemaFieldStates(
      withGrpcSchemaChildCounts(entries),
      messageValue,
    );
  } catch {
    return [];
  }
}

function collectGrpcSchemaFieldEntries(
  node: JsonSchemaNode | undefined,
  root: JsonSchemaNode,
  path: string,
  required: boolean,
  seenRefs: Set<string>,
  entries: GrpcSchemaFieldEntry[],
) {
  if (node == null) {
    return;
  }

  let resolvedNode = node;
  let nextSeenRefs = seenRefs;
  if (node.$ref != null) {
    const ref = node.$ref;
    if (seenRefs.has(ref)) {
      return;
    }
    const target = resolveSchemaRef(root, ref);
    if (target == null) {
      return;
    }
    nextSeenRefs = new Set(seenRefs);
    nextSeenRefs.add(ref);
    resolvedNode = target;
  }

  if (path !== "") {
    const example = buildSchemaTemplate(resolvedNode, root, nextSeenRefs);
    entries.push({
      ...buildGrpcSchemaEntryMetadata(path, resolvedNode),
      required,
      childCount: 0,
      example,
      branchExample: buildSchemaBranch(resolvedNode, root, nextSeenRefs),
      examplePreview: formatGrpcSchemaExample(example),
      messageState: "missing",
    });
  }

  if (resolvedNode.type === "object") {
    const properties = resolvedNode.properties ?? {};
    const requiredNames = new Set(resolvedNode.required ?? Object.keys(properties));
    for (const [name, child] of Object.entries(properties)) {
      collectGrpcSchemaFieldEntries(
        child,
        root,
        path === "" ? name : `${path}.${name}`,
        requiredNames.has(name),
        nextSeenRefs,
        entries,
      );
    }
    if (resolvedNode.additionalProperties != null) {
      collectGrpcSchemaFieldEntries(
        resolvedNode.additionalProperties,
        root,
        path === "" ? "{key}" : `${path}.{key}`,
        false,
        nextSeenRefs,
        entries,
      );
    }
    return;
  }

  if (resolvedNode.type === "array" && resolvedNode.items != null) {
    collectGrpcSchemaFieldEntries(
      resolvedNode.items,
      root,
      path === "" ? "[]" : `${path}[]`,
      required,
      nextSeenRefs,
      entries,
    );
  }
}
