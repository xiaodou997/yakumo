import { isPlainGrpcJsonObject } from "./RequestGrpcMessageValidationModel";
import { mergeGrpcTemplateIntoMessage } from "./RequestGrpcMessageTemplateModel";

export function insertGrpcFieldIntoMessage(
  path: string,
  fieldPath: string,
  value: unknown,
) {
  const trimmed = path.trim();
  try {
    const base = trimmed === "" ? {} : (JSON.parse(trimmed) as unknown);
    if (!isPlainGrpcJsonObject(base)) {
      return {
        ok: false as const,
        error:
          "Current request message must be a JSON object to insert schema fields.",
      };
    }
    const next = { ...base };
    applyGrpcFieldPathValue(next, fieldPath, value);
    return {
      ok: true as const,
      text: JSON.stringify(next, null, 2),
    };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Unable to parse current request message JSON.",
    };
  }
}

function applyGrpcFieldPathValue(
  target: Record<string, unknown>,
  fieldPath: string,
  value: unknown,
) {
  const segments = fieldPath.split(".").filter((segment) => segment !== "");
  let current: Record<string, unknown> = target;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index] ?? "";
    const isArray = segment.endsWith("[]");
    const key = isArray ? segment.slice(0, -2) : segment;
    const isLast = index === segments.length - 1;

    if (key === "{key}") {
      if (isLast && current.key === undefined) {
        current.key = value;
      }
      if (!isLast) {
        if (!isPlainGrpcJsonObject(current.key)) {
          current.key = {};
        }
        current = current.key as Record<string, unknown>;
      }
      continue;
    }

    if (isLast) {
      if (isArray) {
        if (!Array.isArray(current[key])) {
          current[key] = Array.isArray(value) ? value : [value];
        }
      } else if (current[key] === undefined) {
        current[key] = value;
      } else if (isPlainGrpcJsonObject(current[key]) && isPlainGrpcJsonObject(value)) {
        const merged = mergeGrpcTemplateIntoMessage(
          JSON.stringify(current[key]),
          value,
        );
        if (merged.ok) {
          current[key] = JSON.parse(merged.text) as Record<string, unknown>;
        }
      }
      continue;
    }

    if (isArray) {
      if (!Array.isArray(current[key]) || current[key].length === 0) {
        current[key] = [{}];
      }
      const [firstItem] = current[key] as unknown[];
      if (!isPlainGrpcJsonObject(firstItem)) {
        current[key] = [{}];
      }
      current = (current[key] as Array<Record<string, unknown>>)[0] ?? {};
      continue;
    }

    if (!isPlainGrpcJsonObject(current[key])) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
}
