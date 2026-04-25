import type { HttpResponse } from "@yakumo-internal/models";
import { httpResponsesAtom } from "@yakumo-internal/models";
import { useAtomValue } from "jotai";

export function useLatestHttpResponse(requestId: string | null): HttpResponse | null {
  return useAtomValue(httpResponsesAtom).find((r) => r.requestId === requestId) ?? null;
}
