import { useEffect, useRef } from "react";

type KeyFilter = KeyboardEvent["key"] | ((event: KeyboardEvent) => boolean);

interface Options {
  enabled?: boolean;
  event?: "keydown" | "keyup";
}

export function useDocumentKey(
  filter: KeyFilter,
  callback: (event: KeyboardEvent) => void,
  { enabled = true, event = "keydown" }: Options = {},
) {
  const filterRef = useRef(filter);
  const callbackRef = useRef(callback);

  useEffect(() => {
    filterRef.current = filter;
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;

    const handleKey = (keyboardEvent: KeyboardEvent) => {
      const currentFilter = filterRef.current;
      const matches =
        typeof currentFilter === "string"
          ? keyboardEvent.key === currentFilter
          : currentFilter(keyboardEvent);

      if (matches) {
        callbackRef.current(keyboardEvent);
      }
    };

    document.addEventListener(event, handleKey);
    return () => {
      document.removeEventListener(event, handleKey);
    };
  }, [enabled, event]);
}
