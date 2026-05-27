import type { MultipartPart } from "./requestConfigTypes";
import { createMultipartPart } from "./requestConfigFactories";
import { stringOrEmpty } from "./requestConfigSharedHelpers";

export function multipartPartsToConfig(parts: MultipartPart[]) {
  return parts
    .filter((part) => part.name.trim() !== "")
    .map((part) => ({
      name: part.name.trim(),
      kind: part.kind,
      value: part.kind === "text" ? part.value : null,
      filePath: part.kind === "file" ? part.filePath.trim() || null : null,
      fileName: part.fileName.trim() || null,
      contentType: part.contentType.trim() || null,
      enabled: part.enabled !== false,
    }));
}

export function multipartPartsFromConfig(value: unknown): MultipartPart[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        item != null && typeof item === "object",
    )
    .map((item) =>
      createMultipartPart({
        name: stringOrEmpty(item.name),
        kind: stringOrEmpty(item.kind) === "file" ? "file" : "text",
        value: stringOrEmpty(item.value),
        filePath: stringOrEmpty(item.filePath),
        fileName: stringOrEmpty(item.fileName),
        contentType: stringOrEmpty(item.contentType),
        enabled: item.enabled !== false,
      }),
    );
}
