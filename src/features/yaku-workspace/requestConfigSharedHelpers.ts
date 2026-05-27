import type { ConfigPair } from "./types";
import { createConfigPair } from "./requestConfigFactories";

export function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function stringOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function parseOptionalInteger(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    throw new Error(`Invalid integer: ${value}`);
  }
  return parsed;
}

export function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

export function pairsToHeaders(pairs: ConfigPair[]) {
  return pairs
    .map((pair) => ({ name: pair.name.trim(), value: pair.value }))
    .filter((pair) => pair.name !== "");
}

export function pairsToQueryParams(pairs: ConfigPair[]) {
  return pairs
    .map((pair) => ({
      name: pair.name.trim(),
      value: pair.value,
      enabled: pair.enabled !== false,
    }))
    .filter((pair) => pair.name !== "");
}

export function pairsFromHeaders(value: unknown): ConfigPair[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        item != null && typeof item === "object",
    )
    .map((item) =>
      createConfigPair({
        name: stringOrEmpty(item.name),
        value: stringOrEmpty(item.value),
      }),
    );
}

export function pairsFromQuery(value: unknown): ConfigPair[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        item != null && typeof item === "object",
    )
    .map((item) =>
      createConfigPair({
        name: stringOrEmpty(item.name),
        value: stringOrEmpty(item.value),
        enabled: item.enabled !== false,
      }),
    );
}

export function booleanString(value: unknown) {
  return value === true ? "true" : value === false ? "false" : "unset";
}

export function authTypeString(value: unknown) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return "none";
  }
  return stringOrEmpty((value as Record<string, unknown>).type) || "none";
}

export function numberString(value: unknown) {
  return typeof value === "number" ? value.toLocaleString() : "unset";
}

export function arrayLengthString(value: unknown) {
  return Array.isArray(value) ? `${value.length} items` : "unset";
}
