export function formatStatusTransition(base: number | null, current: number | null) {
  if (base == null && current == null) {
    return "unset";
  }
  if (base == null) {
    return `${current ?? "unset"}`;
  }
  if (current == null) {
    return `${base} → unset`;
  }
  return base === current ? `${current}` : `${base} → ${current}`;
}

export function formatCountTransition(base: number, current: number) {
  return base === current ? String(current) : `${base} → ${current}`;
}

export function formatOptionalStringTransition(
  base: string | null,
  current: string | null,
  maxLength: number,
) {
  if (base == null && current == null) {
    return "unset";
  }
  if (base === current) {
    return truncateMiddle(current ?? "unset", maxLength);
  }
  return `${truncateMiddle(base ?? "unset", maxLength)} → ${truncateMiddle(current ?? "unset", maxLength)}`;
}

function truncateMiddle(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  const half = Math.max(1, Math.floor((maxLength - 1) / 2));
  return `${value.slice(0, half)}…${value.slice(value.length - half)}`;
}
