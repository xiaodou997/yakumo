function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function resolveGrpcSchemaFieldState(
  messageValue: Record<string, unknown> | null,
  path: string,
): "filled" | "partial" | "missing" {
  if (messageValue == null) {
    return "missing";
  }
  const segments = path.split(".").filter((segment) => segment !== "");
  let current: unknown = messageValue;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index] ?? "";
    const isLast = index === segments.length - 1;

    if (segment === "{key}") {
      if (!isPlainJsonObject(current)) {
        return "missing";
      }
      const values = Object.values(current);
      if (values.length === 0) {
        return "partial";
      }
      if (isLast) {
        return "filled";
      }
      current = values[0];
      continue;
    }

    const isArraySegment = segment.endsWith("[]");
    const key = isArraySegment ? segment.slice(0, -2) : segment;

    if (!isPlainJsonObject(current)) {
      return "missing";
    }
    if (!(key in current)) {
      return "missing";
    }
    const nextValue = current[key];

    if (isArraySegment) {
      if (!Array.isArray(nextValue)) {
        return "missing";
      }
      if (nextValue.length === 0) {
        return "partial";
      }
      if (isLast) {
        return "filled";
      }
      current = nextValue[0];
      continue;
    }

    if (nextValue === undefined) {
      return "missing";
    }
    if (isLast) {
      return "filled";
    }
    current = nextValue;
  }

  return "filled";
}
