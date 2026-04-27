import { useAtomValue } from "jotai";
import { useEffect, useMemo } from "react";
import { jotaiStore } from "../lib/jotai";
import { getKeyValue, setKeyValue } from "../lib/keyValueStore";
import { activeEnvironmentAtom } from "./useActiveEnvironment";
import { activeWorkspaceIdAtom } from "./useActiveWorkspace";
import { useEnvironmentsBreakdown } from "./useEnvironmentsBreakdown";
import { useKeyValue } from "./useKeyValue";

const kvKey = (workspaceId: string) => `recent_environments::${workspaceId}`;
const namespace = "global";
const fallback: string[] = [];

export function useRecentEnvironments() {
  const activeWorkspaceId = useAtomValue(activeWorkspaceIdAtom);
  const { subEnvironments } = useEnvironmentsBreakdown();
  const kv = useKeyValue<string[]>({
    key: kvKey(activeWorkspaceId ?? "n/a"),
    namespace,
    fallback,
  });

  const validEnvironmentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const environment of subEnvironments) {
      if (environment.workspaceId === activeWorkspaceId) ids.add(environment.id);
    }
    return ids;
  }, [activeWorkspaceId, subEnvironments]);

  const onlyValidIds = useMemo(
    () => kv.value?.filter((id) => validEnvironmentIds.has(id)) ?? [],
    [kv.value, validEnvironmentIds],
  );

  return onlyValidIds;
}

export function useSubscribeRecentEnvironments() {
  useEffect(() => {
    return jotaiStore.sub(activeEnvironmentAtom, async () => {
      const activeEnvironment = jotaiStore.get(activeEnvironmentAtom);
      if (activeEnvironment == null) return;

      const key = kvKey(activeEnvironment.workspaceId);
      const recentIds = getKeyValue<string[]>({ namespace, key, fallback });
      if (recentIds[0] === activeEnvironment.id) return; // Short-circuit

      const withoutActiveId = recentIds.filter((id) => id !== activeEnvironment.id);
      const value = [activeEnvironment.id, ...withoutActiveId];
      await setKeyValue({ namespace, key, value });
    });
  }, []);
}

export async function getRecentEnvironments(workspaceId: string) {
  return getKeyValue<string[]>({
    namespace,
    key: kvKey(workspaceId),
    fallback,
  });
}
