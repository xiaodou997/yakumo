function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function validateGrpcMessageText(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") {
    return {
      label: "empty",
      topLevelKeys: 0,
      description:
        "Empty request messages are sent as null unless a template is applied.",
    };
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed == null || Array.isArray(parsed) || typeof parsed !== "object") {
      return {
        label: "invalid root",
        topLevelKeys: 0,
        description: "gRPC request messages should be JSON objects at the root.",
      };
    }
    const keys = Object.keys(parsed as Record<string, unknown>);
    return {
      label: "valid object",
      topLevelKeys: keys.length,
      description:
        keys.length === 0
          ? "JSON parses correctly and currently has no top-level fields."
          : `JSON parses correctly with ${keys.length} top-level field${keys.length === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    return {
      label: "invalid JSON",
      topLevelKeys: 0,
      description:
        error instanceof Error
          ? error.message
          : "Unable to parse request message JSON.",
    };
  }
}

export function formatGrpcMessageText(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") {
    return {
      ok: false as const,
      error: "Request message is empty.",
    };
  }
  try {
    return {
      ok: true as const,
      text: JSON.stringify(JSON.parse(trimmed), null, 2),
    };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Unable to parse request message JSON.",
    };
  }
}

export function parseGrpcMessageObject(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return isPlainJsonObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isPlainGrpcJsonObject(value: unknown): value is Record<string, unknown> {
  return isPlainJsonObject(value);
}
