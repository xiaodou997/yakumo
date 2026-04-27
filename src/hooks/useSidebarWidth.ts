import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { activeWorkspaceIdAtom } from "./useActiveWorkspace";
import { useLocalStorage } from "./useLocalStorage";

export function useSidebarWidth() {
  const activeWorkspaceId = useAtomValue(activeWorkspaceIdAtom);
  const [width, setWidth] = useLocalStorage<number>(
    `sidebar_width::${activeWorkspaceId ?? "n/a"}`,
    250,
  );
  const resetWidth = useCallback(() => setWidth(250), [setWidth]);
  return [width ?? null, setWidth, resetWidth] as const;
}
