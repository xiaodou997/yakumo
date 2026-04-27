import type { GrpcRequest, HttpRequest, WebsocketRequest } from "@yakumo-internal/models";
import {
  grpcRequestsAtom,
  httpRequestsAtom,
  websocketRequestsAtom,
} from "@yakumo-internal/models";
import { atom, useAtomValue } from "jotai";
import { activeRequestIdAtom } from "./useActiveRequestId";

export const activeRequestAtom = atom((get) => {
  const activeRequestId = get(activeRequestIdAtom);
  if (activeRequestId == null) return null;

  return (
    get(httpRequestsAtom).find((r) => r.id === activeRequestId) ??
    get(grpcRequestsAtom).find((r) => r.id === activeRequestId) ??
    get(websocketRequestsAtom).find((r) => r.id === activeRequestId) ??
    null
  );
});

interface TypeMap {
  http_request: HttpRequest;
  grpc_request: GrpcRequest;
  websocket_request: WebsocketRequest;
}

export function useActiveRequest<T extends keyof TypeMap>(model?: T): TypeMap[T] | null {
  const activeRequest = useAtomValue(activeRequestAtom);
  if (model == null) return activeRequest as TypeMap[T];
  if (activeRequest?.model === model) return activeRequest as TypeMap[T];
  return null;
}
