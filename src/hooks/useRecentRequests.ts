import { useAtomValue } from "jotai";
import { useEffect, useMemo } from "react";
import { jotaiStore } from "../lib/jotai";
import { getKeyValue, setKeyValue } from "../lib/keyValueStore";
import { activeRequestAtom } from "./useActiveRequest";
import { activeWorkspaceIdAtom } from "./useActiveWorkspace";
import { useKeyValue } from "./useKeyValue";
import { requestIdsByWorkspaceIdAtom } from "./useRequestLookupMaps";

const kvKey = (workspaceId: string) => `recent_requests::${workspaceId}`;
const namespace = "global";
const fallback: string[] = [];

export function useRecentRequests() {
  const activeWorkspaceId = useAtomValue(activeWorkspaceIdAtom);
  const requestIdsByWorkspaceId = useAtomValue(requestIdsByWorkspaceIdAtom);

  const { set: setRecentRequests, value: recentRequests } = useKeyValue<string[]>({
    key: kvKey(activeWorkspaceId ?? "n/a"),
    namespace,
    fallback,
  });

  const validRequestIds =
    activeWorkspaceId == null ? null : (requestIdsByWorkspaceId.get(activeWorkspaceId) ?? null);

  const onlyValidIds = useMemo(
    () => recentRequests?.filter((id) => validRequestIds?.has(id)) ?? [],
    [recentRequests, validRequestIds],
  );

  return [onlyValidIds, setRecentRequests] as const;
}

export function useSubscribeRecentRequests() {
  useEffect(() => {
    return jotaiStore.sub(activeRequestAtom, async () => {
      const activeRequest = jotaiStore.get(activeRequestAtom);
      if (activeRequest == null) return;

      const key = kvKey(activeRequest.workspaceId);

      const recentIds = getKeyValue<string[]>({ namespace, key, fallback });
      if (recentIds[0] === activeRequest.id) return; // Short-circuit

      const withoutActiveId = recentIds.filter((id) => id !== activeRequest.id);
      const value = [activeRequest.id, ...withoutActiveId];
      await setKeyValue({ namespace, key, value });
    });
  }, []);
}

export async function getRecentRequests(workspaceId: string) {
  return getKeyValue<string[]>({
    namespace,
    key: kvKey(workspaceId),
    fallback,
  });
}
