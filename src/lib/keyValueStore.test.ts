import type { KeyValue } from "@yakumo-internal/models";
import { modelStoreDataAtom } from "@yakumo-internal/models";
import { afterEach, describe, expect, test } from "vitest";
import { jotaiStore } from "./jotai";
import { getKeyValue, getKeyValueRaw } from "./keyValueStore";

describe("keyValueStore", () => {
  afterEach(() => {
    jotaiStore.set(modelStoreDataAtom, {
      ...jotaiStore.get(modelStoreDataAtom),
      key_value: {},
    });
  });

  test("looks up key values by namespace and key", () => {
    const globalValue = keyValue("kv_1", "global", "shared", "global-value");
    const licenseValue = keyValue("kv_2", "license", "shared", "license-value");

    jotaiStore.set(modelStoreDataAtom, {
      ...jotaiStore.get(modelStoreDataAtom),
      key_value: {
        [globalValue.id]: globalValue,
        [licenseValue.id]: licenseValue,
      },
    });

    expect(getKeyValueRaw({ namespace: "global", key: "shared" })).toBe(globalValue);
    expect(getKeyValue({ namespace: "license", key: "shared", fallback: "fallback" })).toBe(
      "license-value",
    );
    expect(getKeyValue({ key: "missing", fallback: "fallback" })).toBe("fallback");
  });
});

function keyValue(id: string, namespace: string, key: string, rawValue: string): KeyValue {
  return {
    model: "key_value",
    id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    namespace,
    key,
    value: JSON.stringify(rawValue),
  };
}
