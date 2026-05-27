import type { JsonSchemaNode } from "./RequestGrpcSchemaTypes";

export function buildGrpcTemplateFromSchemaText(schemaText: string) {
  try {
    const root = JSON.parse(schemaText) as JsonSchemaNode;
    return buildSchemaTemplate(root, root, new Set<string>());
  } catch {
    return null;
  }
}

export function buildSchemaTemplate(
  node: JsonSchemaNode | undefined,
  root: JsonSchemaNode,
  seenRefs: Set<string>,
): unknown {
  if (node == null) {
    return null;
  }

  if (node.$ref != null) {
    const ref = node.$ref;
    if (seenRefs.has(ref)) {
      return {};
    }
    const target = resolveSchemaRef(root, ref);
    if (target == null) {
      return {};
    }
    const nextSeenRefs = new Set(seenRefs);
    nextSeenRefs.add(ref);
    return buildSchemaTemplate(target, root, nextSeenRefs);
  }

  if (Array.isArray(node.enum) && node.enum.length > 0) {
    return node.enum[0];
  }

  switch (node.type) {
    case "object": {
      const properties = node.properties ?? {};
      const required = new Set(node.required ?? Object.keys(properties));
      const entries = Object.entries(properties)
        .filter(([name]) => required.has(name))
        .map(
          ([name, child]) =>
            [name, buildSchemaTemplate(child, root, seenRefs)] as const,
        );

      if (entries.length > 0) {
        return Object.fromEntries(entries);
      }

      if (node.additionalProperties != null) {
        return {
          key: buildSchemaTemplate(node.additionalProperties, root, seenRefs),
        };
      }

      return {};
    }
    case "array":
      return node.items == null
        ? []
        : [buildSchemaTemplate(node.items, root, seenRefs)];
    case "boolean":
      return false;
    case "number":
      return node.format != null && node.format.includes("64") ? "0" : 0;
    case "null":
      return null;
    case "string":
      return defaultStringForSchema(node);
    default:
      return {};
  }
}

export function buildSchemaBranch(
  node: JsonSchemaNode | undefined,
  root: JsonSchemaNode,
  seenRefs: Set<string>,
): unknown {
  if (node == null) {
    return null;
  }

  if (node.$ref != null) {
    const ref = node.$ref;
    if (seenRefs.has(ref)) {
      return {};
    }
    const target = resolveSchemaRef(root, ref);
    if (target == null) {
      return {};
    }
    const nextSeenRefs = new Set(seenRefs);
    nextSeenRefs.add(ref);
    return buildSchemaBranch(target, root, nextSeenRefs);
  }

  if (node.type === "array") {
    return [];
  }
  if (node.type === "object") {
    return {};
  }
  return null;
}

export function resolveSchemaRef(root: JsonSchemaNode, ref: string) {
  if (ref === "#") {
    return root;
  }
  const match = ref.match(/^#\/\$defs\/(.+)$/);
  const defName = match?.[1];
  if (defName == null) {
    return null;
  }
  return root.$defs?.[defName] ?? null;
}

function defaultStringForSchema(node: JsonSchemaNode) {
  switch (node.format) {
    case "date-time":
      return "1970-01-01T00:00:00Z";
    case "date":
      return "1970-01-01";
    case "uuid":
      return "00000000-0000-0000-0000-000000000000";
    case "email":
      return "user@example.com";
    case "uri":
    case "url":
      return "https://example.com";
    case "byte":
      return "AA==";
    case "int64":
    case "uint64":
    case "sint64":
    case "fixed64":
    case "sfixed64":
      return "0";
    default:
      return "example";
  }
}
