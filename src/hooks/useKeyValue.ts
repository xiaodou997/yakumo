import deepEqual from "@gilbarbara/deep-equal";
import { useMutation } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { selectAtom } from "jotai/utils";
import { useCallback, useMemo } from "react";
import { jotaiStore } from "../lib/jotai";
import {
  buildKeyValueKey,
  buildKeyValueLookupKey,
  extractKeyValueOrFallback,
  keyValuesByNamespaceAndKeyAtom,
  setKeyValue,
} from "../lib/keyValueStore";

const DEFAULT_NAMESPACE = "global";

export function useKeyValue<T extends object | boolean | number | string | null>({
  namespace = DEFAULT_NAMESPACE,
  key,
  fallback,
}: {
  namespace?: "global" | "no_sync" | "license";
  key: string | string[];
  fallback: T;
}) {
  const storageKey = buildKeyValueKey(key);
  const lookupKey = buildKeyValueLookupKey(namespace, storageKey);

  const { value, isLoading } = useAtomValue(
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- Only create a new atom when the key changes. Fallback might not be a stable reference, so we don't want to refresh on that.
    useMemo(
      () =>
        selectAtom(
          keyValuesByNamespaceAndKeyAtom,
          (keyValuesByNamespaceAndKey) => {
            const keyValue = keyValuesByNamespaceAndKey.get(lookupKey) ?? null;
            return { value: extractKeyValueOrFallback(keyValue, fallback), isLoading: false };
          },
          (a, b) => deepEqual(a, b),
        ),
      [lookupKey],
    ),
  );

  const { mutateAsync } = useMutation<void, unknown, T>({
    mutationKey: ["set_key_value", namespace, key],
    mutationFn: (value) => setKeyValue<T>({ namespace, key, value }),
  });

  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const set = useCallback(
    async (valueOrUpdate: ((v: T) => T) | T) => {
      if (typeof valueOrUpdate === "function") {
        const newV = valueOrUpdate(value ?? fallback);
        if (newV === value) return;
        await mutateAsync(newV);
      } else {
        // TODO: Make this only update if the value is different. I tried this but it seems query.data
        //  is stale.
        await mutateAsync(valueOrUpdate);
      }
    },
    [lookupKey, namespace, value],
  );

  const reset = useCallback(async () => mutateAsync(fallback), [fallback, mutateAsync]);

  return useMemo(
    () => ({
      value,
      isLoading,
      set,
      reset,
    }),
    [isLoading, reset, set, value],
  );
}

export function getKeyValue<T extends object | boolean | number | string | null>({
  namespace = DEFAULT_NAMESPACE,
  key,
  fallback,
}: {
  namespace?: "global" | "no_sync" | "license";
  key: string | string[];
  fallback: T;
}) {
  const keyValue =
    jotaiStore
      .get(keyValuesByNamespaceAndKeyAtom)
      .get(buildKeyValueLookupKey(namespace, key)) ??
    null;
  const value = extractKeyValueOrFallback(keyValue, fallback);
  return value;
}
