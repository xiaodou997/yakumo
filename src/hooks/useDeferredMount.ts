import { useEffect, useState } from "react";

export function useDeferredMount({
  timeout = 500,
  fallbackDelay = 250,
}: {
  timeout?: number;
  fallbackDelay?: number;
} = {}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const done = () => {
      if (!cancelled) setReady(true);
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(done, { timeout });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const id = globalThis.setTimeout(done, fallbackDelay);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(id);
    };
  }, [fallbackDelay, timeout]);

  return ready;
}
