import type { KeyValue } from "@yakumo-internal/models";
import { createGlobalModel, keyValuesAtom, patchModel } from "@yakumo-internal/models";
import { atom } from "jotai";
import { jotaiStore } from "./jotai";

export const keyValuesByNamespaceAndKeyAtom = atom((get) => {
  const keyValuesByNamespaceAndKey = new Map<string, KeyValue>();
  for (const keyValue of get(keyValuesAtom)) {
    keyValuesByNamespaceAndKey.set(
      buildKeyValueLookupKey(keyValue.namespace, keyValue.key),
      keyValue,
    );
  }
  return keyValuesByNamespaceAndKey;
});

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

  if (kv) {
    await patchModel(kv, { namespace, key, value });
  } else {
    await createGlobalModel({ model: "key_value", namespace, key, value });
  }
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
