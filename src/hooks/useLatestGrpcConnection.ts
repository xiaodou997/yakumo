import type { GrpcConnection } from "@yakumo-internal/models";
import { grpcConnectionsAtom } from "@yakumo-internal/models";
import { atom, useAtomValue } from "jotai";

export const grpcConnectionsByRequestIdAtom = atom((get) => {
  const connectionsByRequestId = new Map<string, GrpcConnection[]>();
  const connectionsById = new Map<string, GrpcConnection>();
  for (const connection of get(grpcConnectionsAtom)) {
    connectionsById.set(connection.id, connection);
    const connections = connectionsByRequestId.get(connection.requestId);
    if (connections == null) {
      connectionsByRequestId.set(connection.requestId, [connection]);
    } else {
      connections.push(connection);
    }
  }
  return { connectionsById, connectionsByRequestId };
});

export function useLatestGrpcConnection(requestId: string | null): GrpcConnection | null {
  const { connectionsByRequestId } = useAtomValue(grpcConnectionsByRequestIdAtom);
  return requestId == null ? null : (connectionsByRequestId.get(requestId)?.[0] ?? null);
}
