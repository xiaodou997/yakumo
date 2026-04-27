import type { GrpcRequest, HttpRequest, WebsocketRequest } from "@yakumo-internal/models";
import {
  grpcRequestsAtom,
  httpRequestsAtom,
  websocketRequestsAtom,
} from "@yakumo-internal/models";
import { atom } from "jotai";

export type RequestModel = HttpRequest | GrpcRequest | WebsocketRequest;

export const requestsByIdAtom = atom((get) => {
  const requestsById = new Map<string, RequestModel>();
  for (const request of get(httpRequestsAtom)) {
    requestsById.set(request.id, request);
  }
  for (const request of get(grpcRequestsAtom)) {
    requestsById.set(request.id, request);
  }
  for (const request of get(websocketRequestsAtom)) {
    requestsById.set(request.id, request);
  }
  return requestsById;
});

export const requestIdsByWorkspaceIdAtom = atom((get) => {
  const idsByWorkspaceId = new Map<string, Set<string>>();
  for (const request of get(httpRequestsAtom)) {
    addRequestId(idsByWorkspaceId, request.workspaceId, request.id);
  }
  for (const request of get(grpcRequestsAtom)) {
    addRequestId(idsByWorkspaceId, request.workspaceId, request.id);
  }
  for (const request of get(websocketRequestsAtom)) {
    addRequestId(idsByWorkspaceId, request.workspaceId, request.id);
  }
  return idsByWorkspaceId;
});

function addRequestId(idsByWorkspaceId: Map<string, Set<string>>, workspaceId: string, id: string) {
  const ids = idsByWorkspaceId.get(workspaceId);
  if (ids == null) {
    idsByWorkspaceId.set(workspaceId, new Set([id]));
  } else {
    ids.add(id);
  }
}
