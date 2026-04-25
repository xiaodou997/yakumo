import {
  grpcRequestsAtom,
  httpRequestsAtom,
  websocketRequestsAtom,
} from "@yakumo-internal/models";
import { atom, useAtomValue } from "jotai";

export const allRequestsAtom = atom((get) => [
  ...get(httpRequestsAtom),
  ...get(grpcRequestsAtom),
  ...get(websocketRequestsAtom),
]);

export function useAllRequests() {
  return useAtomValue(allRequestsAtom);
}
