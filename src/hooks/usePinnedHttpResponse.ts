import type { HttpResponse } from "@yakumo-internal/models";
import { useAtomValue } from "jotai";
import { useKeyValue } from "./useKeyValue";
import { httpResponsesByRequestIdAtom } from "./useLatestHttpResponse";

export function usePinnedHttpResponse(activeRequestId: string) {
  const responsesByRequestId = useAtomValue(httpResponsesByRequestIdAtom);
  const responses = responsesByRequestId.get(activeRequestId) ?? [];
  const latestResponse = responses[0] ?? null;
  const { set, value: pinnedResponseId } = useKeyValue<string | null>({
    // Key on the latest response instead of activeRequest because responses change out of band of active request
    key: ["pinned_http_response_id", latestResponse?.id ?? "n/a"],
    fallback: null,
    namespace: "global",
  });
  const activeResponse: HttpResponse | null =
    responses.find((r) => r.id === pinnedResponseId) ?? latestResponse;

  const setPinnedResponseId = async (id: string) => {
    if (pinnedResponseId === id) {
      await set(null);
    } else {
      await set(id);
    }
  };

  return { activeResponse, setPinnedResponseId, pinnedResponseId, responses } as const;
}
