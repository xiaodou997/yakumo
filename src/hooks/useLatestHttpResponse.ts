import type { HttpResponse } from "@yakumo-internal/models";
import { httpResponsesAtom } from "@yakumo-internal/models";
import { atom, useAtomValue } from "jotai";

export const httpResponsesByRequestIdAtom = atom((get) => {
  const responsesByRequestId = new Map<string, HttpResponse[]>();
  for (const response of get(httpResponsesAtom)) {
    const responses = responsesByRequestId.get(response.requestId);
    if (responses == null) {
      responsesByRequestId.set(response.requestId, [response]);
    } else {
      responses.push(response);
    }
  }
  return responsesByRequestId;
});

export function useLatestHttpResponse(requestId: string | null): HttpResponse | null {
  const responsesByRequestId = useAtomValue(httpResponsesByRequestIdAtom);
  return requestId == null ? null : (responsesByRequestId.get(requestId)?.[0] ?? null);
}
