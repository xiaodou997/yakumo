import type { YakuSecretAuditItem } from "../../lib/yaku-client";

export const SECRET_HOTSPOT_REFERENCE_COUNT = 3;

export function listSecretFacetOptions(
  items: YakuSecretAuditItem[],
  key: "kind" | "storage",
  unknownLabel: string,
) {
  return Array.from(new Set(items.map((item) => item[key] ?? "__unknown__")))
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({
      label: value === "__unknown__" ? unknownLabel : value,
      value,
    }));
}

export function matchesSecretSearch(item: YakuSecretAuditItem, normalizedSearch: string) {
  const haystack = [
    item.secret.name,
    item.secret.id,
    item.kind ?? "",
    item.storage ?? "",
    JSON.stringify(item.secret.metadata ?? {}),
    ...item.references.flatMap((reference) => [
      reference.requestId,
      reference.requestName,
      reference.nodePath,
      reference.authType,
      reference.authField,
    ]),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalizedSearch);
}

export function sortSecretItems(items: YakuSecretAuditItem[], sort: string) {
  const sorted = [...items];
  if (sort === "name") {
    return sorted.sort((left, right) =>
      (left.secret.name || left.secret.id).localeCompare(right.secret.name || right.secret.id),
    );
  }
  if (sort === "most_referenced") {
    return sorted.sort((left, right) => {
      if (right.references.length !== left.references.length) {
        return right.references.length - left.references.length;
      }
      if (left.orphan !== right.orphan) {
        return left.orphan ? 1 : -1;
      }
      return (left.secret.name || left.secret.id).localeCompare(right.secret.name || right.secret.id);
    });
  }
  return sorted.sort((left, right) => {
    if (left.orphan !== right.orphan) {
      return left.orphan ? -1 : 1;
    }
    if (right.references.length !== left.references.length) {
      return right.references.length - left.references.length;
    }
    return (left.secret.name || left.secret.id).localeCompare(right.secret.name || right.secret.id);
  });
}

export function describeSecretSort(sort: string) {
  if (sort === "most_referenced") {
    return "Most referenced";
  }
  if (sort === "name") {
    return "Alphabetical";
  }
  return "Orphans first";
}

export function groupSecretReferencesByRequestPath(items: YakuSecretAuditItem[]) {
  const grouped = new Map<
    string,
    {
      requestId: string;
      requestName: string;
      nodePath: string;
      referenceCount: number;
    }
  >();

  for (const item of items) {
    for (const reference of item.references) {
      const key = `${reference.requestId}@@${reference.nodePath}`;
      const existing = grouped.get(key);
      if (existing == null) {
        grouped.set(key, {
          requestId: reference.requestId,
          requestName: reference.requestName,
          nodePath: reference.nodePath,
          referenceCount: 1,
        });
        continue;
      }
      existing.referenceCount += 1;
    }
  }

  return [...grouped.values()].sort((left, right) => {
    if (right.referenceCount !== left.referenceCount) {
      return right.referenceCount - left.referenceCount;
    }
    return (
      left.requestName.localeCompare(right.requestName) ||
      left.nodePath.localeCompare(right.nodePath)
    );
  });
}

export function groupSecretReferencesByRequest(items: YakuSecretAuditItem[]) {
  const grouped = new Map<
    string,
    {
      requestId: string;
      requestName: string;
      referenceCount: number;
      secretIds: Set<string>;
    }
  >();

  for (const item of items) {
    for (const reference of item.references) {
      const existing = grouped.get(reference.requestId);
      if (existing == null) {
        grouped.set(reference.requestId, {
          requestId: reference.requestId,
          requestName: reference.requestName,
          referenceCount: 1,
          secretIds: new Set([item.secret.id]),
        });
        continue;
      }

      existing.referenceCount += 1;
      existing.secretIds.add(item.secret.id);
    }
  }

  return [...grouped.values()]
    .map((entry) => ({
      requestId: entry.requestId,
      requestName: entry.requestName,
      referenceCount: entry.referenceCount,
      secretCount: entry.secretIds.size,
    }))
    .sort((left, right) => {
      if (right.referenceCount !== left.referenceCount) {
        return right.referenceCount - left.referenceCount;
      }
      if (right.secretCount !== left.secretCount) {
        return right.secretCount - left.secretCount;
      }
      return left.requestName.localeCompare(right.requestName);
    });
}

export function countSecretFacetGroups(
  items: YakuSecretAuditItem[],
  key: "kind" | "storage",
  unknownLabel: string,
) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = item[key] ?? unknownLabel;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export function describeSecretFilters({
  focusedRequest,
  kind,
  storage,
  orphanOnly,
}: {
  focusedRequest: { requestName: string; nodePath: string | null } | null;
  kind: string;
  storage: string;
  orphanOnly: boolean;
}) {
  const parts: string[] = [];

  if (focusedRequest != null) {
    parts.push(
      `request=${focusedRequest.requestName}${focusedRequest.nodePath == null ? "" : `#${focusedRequest.nodePath}`}`,
    );
  }

  if (kind !== "__all__") {
    parts.push(`kind=${kind === "__unknown__" ? "unknown" : kind}`);
  }
  if (storage !== "__all__") {
    parts.push(`storage=${storage === "__unknown__" ? "unknown" : storage}`);
  }
  if (orphanOnly) {
    parts.push("orphans only");
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}
