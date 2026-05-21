import { atom } from "jotai";
import { jotaiStore } from "./jotai";

export interface KeyValue {
  namespace: string;
  key: string;
  value: string;
}

const storagePrefix = "yaku.kv.";
const memoryStore = new Map<string, string>();

export const keyValuesByNamespaceAndKeyAtom = atom<Map<string, KeyValue>>(readAllKeyValues());

export async function setKeyValue<T>({
  namespace = "global",
  key: keyOrKeys,
  value: rawValue,
}: {
  namespace?: string;
  key: string | string[];
  value: T;
}): Promise<void> {
  const kv = getKeyValueRaw({ namespace, key: keyOrKeys });
  const key = buildKeyValueKey(keyOrKeys);
  const value = JSON.stringify(rawValue);
  const next = { namespace, key, value };

  if (kv) {
    writeStoredValue(namespace, key, value);
  } else {
    writeStoredValue(namespace, key, value);
  }

  jotaiStore.set(keyValuesByNamespaceAndKeyAtom, (prev) => {
    const copy = new Map(prev);
    copy.set(buildKeyValueLookupKey(namespace, key), next);
    return copy;
  });
}

export function getKeyValueRaw({
  namespace = "global",
  key: keyOrKeys,
}: {
  namespace?: string;
  key: string | string[];
}) {
  return (
    jotaiStore
      .get(keyValuesByNamespaceAndKeyAtom)
      .get(buildKeyValueLookupKey(namespace, keyOrKeys)) ??
    null
  );
}

export function getKeyValue<T>({
  namespace = "global",
  key,
  fallback,
}: {
  namespace?: string;
  key: string | string[];
  fallback: T;
}) {
  const kv = getKeyValueRaw({ namespace, key });
  return extractKeyValueOrFallback(kv, fallback);
}

export function extractKeyValue<T>(kv: KeyValue | null): T | undefined {
  if (kv === null) return undefined;
  try {
    return JSON.parse(kv.value) as T;
  } catch (err) {
    console.log("Failed to parse kv value", kv.value, err);
    return undefined;
  }
}

export function extractKeyValueOrFallback<T>(kv: KeyValue | null, fallback: T): T {
  const v = extractKeyValue<T>(kv);
  if (v === undefined) return fallback;
  return v;
}

export function buildKeyValueKey(key: string | string[]): string {
  if (typeof key === "string") return key;
  return key.join("::");
}

export function buildKeyValueLookupKey(namespace: string, key: string | string[]): string {
  return JSON.stringify([namespace, buildKeyValueKey(key)]);
}

function buildStorageKey(namespace: string, key: string) {
  return `${storagePrefix}${namespace}.${key}`;
}

function readAllKeyValues() {
  const values = new Map<string, KeyValue>();
  if (typeof localStorage === "undefined") {
    for (const [storageKey, value] of memoryStore) {
      const parsed = parseStorageKey(storageKey);
      if (parsed == null) continue;
      values.set(buildKeyValueLookupKey(parsed.namespace, parsed.key), { ...parsed, value });
    }
    return values;
  }

  for (let i = 0; i < localStorage.length; i += 1) {
    const storageKey = localStorage.key(i);
    if (storageKey == null || !storageKey.startsWith(storagePrefix)) continue;
    const parsed = parseStorageKey(storageKey);
    if (parsed == null) continue;
    values.set(buildKeyValueLookupKey(parsed.namespace, parsed.key), {
      ...parsed,
      value: localStorage.getItem(storageKey) ?? "null",
    });
  }
  return values;
}

function writeStoredValue(namespace: string, key: string, value: string) {
  const storageKey = buildStorageKey(namespace, key);
  if (typeof localStorage === "undefined") {
    memoryStore.set(storageKey, value);
    return;
  }
  localStorage.setItem(storageKey, value);
}

function parseStorageKey(storageKey: string) {
  if (!storageKey.startsWith(storagePrefix)) return null;
  const remainder = storageKey.slice(storagePrefix.length);
  const dotIndex = remainder.indexOf(".");
  if (dotIndex < 0) return null;
  return {
    namespace: remainder.slice(0, dotIndex),
    key: remainder.slice(dotIndex + 1),
  };
}
