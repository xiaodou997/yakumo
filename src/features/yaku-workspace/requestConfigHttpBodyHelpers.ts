import { stringOrEmpty } from "./requestConfigSharedHelpers";

export function bodyObjectFromConfig(config: Record<string, unknown>) {
  if (config.body == null) return null;
  if (typeof config.body === "object" && !Array.isArray(config.body)) {
    return config.body as Record<string, unknown>;
  }
  if (typeof config.body !== "string") return null;
  try {
    const parsed = JSON.parse(config.body) as unknown;
    if (parsed == null || Array.isArray(parsed) || typeof parsed !== "object") {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function normalizedHttpBodyMode(input: { httpBodyMode: string }) {
  const mode = input.httpBodyMode.trim().toLowerCase();
  if (mode === "" || mode === "none") return "text";
  return mode;
}

export function inferredHttpBodyMode(config: Record<string, unknown>) {
  if (
    Array.isArray(config.multipartParts) &&
    config.multipartParts.length > 0
  ) {
    return "multipart";
  }
  return config.bodyFilePath == null ? "text" : "file";
}

export function multipartSummary(value: unknown) {
  if (!Array.isArray(value)) return "multipart";
  const enabledParts = value.filter((item) => {
    if (item == null || typeof item !== "object") return false;
    return (item as Record<string, unknown>).enabled !== false;
  });
  return enabledParts.length === 0
    ? "multipart empty"
    : `${enabledParts.length} parts`;
}

export function bodySummary(config: Record<string, unknown>) {
  if (
    stringOrEmpty(config.graphqlQuery) !== "" ||
    config.graphqlVariables != null
  ) {
    return "graphql payload";
  }
  const mode = stringOrEmpty(config.bodyMode) || inferredHttpBodyMode(config);
  if (mode === "file") {
    return stringOrEmpty(config.bodyFilePath) === "" ? "file missing" : "file";
  }
  if (mode === "multipart") {
    return multipartSummary(config.multipartParts);
  }
  return config.body == null ? "empty" : `${mode} set`;
}
