import { isPlainGrpcJsonObject } from "./RequestGrpcMessageValidationModel";

function mergeMissingJsonFields(
  current: Record<string, unknown>,
  template: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...current };
  for (const [key, templateValue] of Object.entries(template)) {
    const currentValue = merged[key];
    if (currentValue === undefined) {
      merged[key] = templateValue;
      continue;
    }
    if (isPlainGrpcJsonObject(currentValue) && isPlainGrpcJsonObject(templateValue)) {
      merged[key] = mergeMissingJsonFields(currentValue, templateValue);
    }
  }
  return merged;
}

export function mergeGrpcTemplateIntoMessage(
  currentText: string,
  template: unknown,
) {
  const trimmed = currentText.trim();
  if (trimmed === "") {
    return {
      ok: true as const,
      text: JSON.stringify(template, null, 2),
    };
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isPlainGrpcJsonObject(parsed)) {
      return {
        ok: false as const,
        error:
          "Current request message must be a JSON object to fill missing fields.",
      };
    }
    if (!isPlainGrpcJsonObject(template)) {
      return {
        ok: false as const,
        error: "Discovered template is not a JSON object.",
      };
    }
    return {
      ok: true as const,
      text: JSON.stringify(mergeMissingJsonFields(parsed, template), null, 2),
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

export function countGrpcTemplateFields(template: unknown): number {
  if (!isPlainGrpcJsonObject(template)) {
    return 0;
  }
  let count = 0;
  for (const value of Object.values(template)) {
    count += 1;
    if (isPlainGrpcJsonObject(value)) {
      count += countGrpcTemplateFields(value);
    }
  }
  return count;
}
