export function asOptionalString(value: unknown) {
  return typeof value === "string" ? value : null;
}

export function asOptionalNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

export function asOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

export function arrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}
