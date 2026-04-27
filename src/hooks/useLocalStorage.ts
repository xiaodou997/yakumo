import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type StoredValue<T> = T | undefined;

function readLocalStorageValue<T>(key: string, fallback: StoredValue<T>): StoredValue<T> {
  try {
    const value = localStorage.getItem(key);
    if (value == null) return fallback;

    return JSON.parse(value) as T;
  } catch (err) {
    console.error(err);
    return fallback;
  }
}

export function useLocalStorage<T>(
  key: string,
  initialValue?: T,
): readonly [StoredValue<T>, Dispatch<SetStateAction<StoredValue<T>>>] {
  const initialValueRef = useRef<StoredValue<T>>(initialValue);
  const [value, setValue] = useState<StoredValue<T>>(() =>
    readLocalStorageValue(key, initialValueRef.current),
  );

  useEffect(() => {
    setValue(readLocalStorageValue(key, initialValueRef.current));
  }, [key]);

  const setStoredValue = useCallback<Dispatch<SetStateAction<StoredValue<T>>>>(
    (nextValue) => {
      setValue((previousValue) => {
        const resolvedValue =
          typeof nextValue === "function"
            ? (nextValue as (value: StoredValue<T>) => StoredValue<T>)(previousValue)
            : nextValue;

        try {
          if (resolvedValue === undefined) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, JSON.stringify(resolvedValue));
          }
        } catch (err) {
          console.error(err);
        }

        return resolvedValue;
      });
    },
    [key],
  );

  return [value, setStoredValue];
}
