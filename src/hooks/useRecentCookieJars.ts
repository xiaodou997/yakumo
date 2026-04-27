import { cookieJarsAtom } from "@yakumo-internal/models";
import { useAtomValue } from "jotai";
import { useEffect, useMemo } from "react";
import { jotaiStore } from "../lib/jotai";
import { getKeyValue, setKeyValue } from "../lib/keyValueStore";
import { activeCookieJarAtom } from "./useActiveCookieJar";
import { activeWorkspaceIdAtom } from "./useActiveWorkspace";
import { useKeyValue } from "./useKeyValue";

const kvKey = (workspaceId: string) => `recent_cookie_jars::${workspaceId}`;
const namespace = "global";
const fallback: string[] = [];

export function useRecentCookieJars() {
  const activeWorkspaceId = useAtomValue(activeWorkspaceIdAtom);
  const cookieJars = useAtomValue(cookieJarsAtom);
  const kv = useKeyValue<string[]>({
    key: kvKey(activeWorkspaceId ?? "n/a"),
    namespace,
    fallback,
  });

  const validCookieJarIds = useMemo(() => {
    const ids = new Set<string>();
    for (const cookieJar of cookieJars) {
      if (cookieJar.workspaceId === activeWorkspaceId) ids.add(cookieJar.id);
    }
    return ids;
  }, [activeWorkspaceId, cookieJars]);

  const onlyValidIds = useMemo(
    () => kv.value?.filter((id) => validCookieJarIds.has(id)) ?? [],
    [kv.value, validCookieJarIds],
  );

  return onlyValidIds;
}

export function useSubscribeRecentCookieJars() {
  useEffect(() => {
    return jotaiStore.sub(activeCookieJarAtom, async () => {
      const activeCookieJar = jotaiStore.get(activeCookieJarAtom);
      if (activeCookieJar == null) return;

      const key = kvKey(activeCookieJar.workspaceId);

      const recentIds = getKeyValue<string[]>({ namespace, key, fallback });
      if (recentIds[0] === activeCookieJar.id) return; // Short-circuit

      const withoutActiveId = recentIds.filter((id) => id !== activeCookieJar.id);
      const value = [activeCookieJar.id, ...withoutActiveId];
      await setKeyValue({ namespace, key, value });
    });
  }, []);
}

export async function getRecentCookieJars(workspaceId: string) {
  return getKeyValue<string[]>({
    namespace,
    key: kvKey(workspaceId),
    fallback,
  });
}
