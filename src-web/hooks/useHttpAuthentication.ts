import { useQuery } from "@tanstack/react-query";
import type { GetHttpAuthenticationSummaryResponse } from "@yaakapp-internal/plugins";
import { atom, useAtomValue } from "jotai";
import { useState } from "react";
import { jotaiStore } from "../lib/jotai";
import { invokeCmd } from "../lib/tauri";

const httpAuthenticationSummariesAtom = atom<GetHttpAuthenticationSummaryResponse[]>([]);
const orderedHttpAuthenticationAtom = atom((get) =>
  get(httpAuthenticationSummariesAtom)?.sort((a, b) => a.name.localeCompare(b.name)),
);

export function useHttpAuthenticationSummaries() {
  return useAtomValue(orderedHttpAuthenticationAtom);
}

export function useSubscribeHttpAuthentication() {
  const [numResults, setNumResults] = useState<number>(0);

  useQuery({
    queryKey: ["http_authentication_summaries"],
    // Fetch periodically until functions are returned
    // NOTE: visibilitychange (refetchOnWindowFocus) does not work on Windows, so we'll rely on this logic
    //  to refetch things until that's working again
    refetchInterval: numResults > 0 ? Number.POSITIVE_INFINITY : 1000,
    refetchOnMount: true,
    placeholderData: (prev) => prev, // Keep previous data on refetch
    queryFn: async () => {
      try {
        const result = await invokeCmd<GetHttpAuthenticationSummaryResponse[]>(
          "cmd_get_http_authentication_summaries",
        );
        setNumResults(result.length);
        jotaiStore.set(httpAuthenticationSummariesAtom, result);
        return result;
      } catch (err) {
        console.warn("Failed to get authentication summaries:", err);
        return [];
      }
    },
  });
}