import {
  grpcRequestsAtom,
  httpRequestsAtom,
  websocketRequestsAtom,
} from "@yakumo-internal/models";
import { useAtomValue } from "jotai";
import { useEffect, useMemo } from "react";
import { jotaiStore } from "../lib/jotai";
import { getKeyValue, setKeyValue } from "../lib/keyValueStore";
import { activeRequestAtom } from "./useActiveRequest";
import { activeWorkspaceIdAtom } from "./useActiveWorkspace";
import { useKeyValue } from "./useKeyValue";

const kvKey = (workspaceId: string) => `recent_requests::${workspaceId}`;
const namespace = "global";
const fallback: string[] = [];

export function useRecentRequests() {
  const activeWorkspaceId = useAtomValue(activeWorkspaceIdAtom);
  const httpRequests = useAtomValue(httpRequestsAtom);
  const grpcRequests = useAtomValue(grpcRequestsAtom);
  const websocketRequests = useAtomValue(websocketRequestsAtom);

  const { set: setRecentRequests, value: recentRequests } = useKeyValue<string[]>({
    key: kvKey(activeWorkspaceId ?? "n/a"),
    namespace,
    fallback,
  });

  const validRequestIds = useMemo(() => {
    const ids = new Set<string>();
    for (const request of httpRequests) {
      if (request.workspaceId === activeWorkspaceId) ids.add(request.id);
    }
    for (const request of grpcRequests) {
      if (request.workspaceId === activeWorkspaceId) ids.add(request.id);
    }
    for (const request of websocketRequests) {
      if (request.workspaceId === activeWorkspaceId) ids.add(request.id);
    }
    return ids;
  }, [activeWorkspaceId, grpcRequests, httpRequests, websocketRequests]);

  const onlyValidIds = useMemo(
    () => recentRequests?.filter((id) => validRequestIds.has(id)) ?? [],
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
