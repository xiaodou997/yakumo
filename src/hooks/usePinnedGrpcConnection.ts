import { invoke } from "@tauri-apps/api/core";
import type { GrpcConnection, GrpcEvent } from "@yakumo-internal/models";
import {
  grpcEventsAtom,
  mergeModelsInStore,
  replaceModelsInStore,
} from "@yakumo-internal/models";
import { atom, useAtomValue } from "jotai";
import { useEffect } from "react";
import { fireAndForget } from "../lib/fireAndForget";
import { atomWithKVStorage } from "../lib/atoms/atomWithKVStorage";
import { activeRequestIdAtom } from "./useActiveRequestId";
import { grpcConnectionsByRequestIdAtom } from "./useLatestGrpcConnection";

const pinnedGrpcConnectionIdsAtom = atomWithKVStorage<Record<string, string | null>>(
  "pinned-grpc-connection-ids",
  {},
);

export const pinnedGrpcConnectionIdAtom = atom(
  (get) => {
    const activeRequestId = get(activeRequestIdAtom);
    const activeConnections = get(activeGrpcConnections);
    const latestConnection = activeConnections[0] ?? null;
    if (!activeRequestId) return null;

    const key = recordKey(activeRequestId, latestConnection);
    return get(pinnedGrpcConnectionIdsAtom)[key] ?? null;
  },
  (get, set, id: string | null) => {
    const activeRequestId = get(activeRequestIdAtom);
    const activeConnections = get(activeGrpcConnections);
    const latestConnection = activeConnections[0] ?? null;
    if (!activeRequestId) return;

    const key = recordKey(activeRequestId, latestConnection);
    set(pinnedGrpcConnectionIdsAtom, (prev) => ({
      ...prev,
      [key]: id,
    }));
  },
);

function recordKey(activeRequestId: string | null, latestConnection: GrpcConnection | null) {
  return `${activeRequestId}-${latestConnection?.id ?? "none"}`;
}

export const activeGrpcConnections = atom<GrpcConnection[]>((get) => {
  const activeRequestId = get(activeRequestIdAtom) ?? "n/a";
  return get(grpcConnectionsByRequestIdAtom).connectionsByRequestId.get(activeRequestId) ?? [];
});

export const activeGrpcConnectionAtom = atom<GrpcConnection | null>((get) => {
  const activeRequestId = get(activeRequestIdAtom) ?? "n/a";
  const activeConnections = get(activeGrpcConnections);
  const latestConnection = activeConnections[0] ?? null;
  const { connectionsById } = get(grpcConnectionsByRequestIdAtom);
  const pinnedConnectionId = get(pinnedGrpcConnectionIdsAtom)[
    recordKey(activeRequestId, latestConnection)
  ];
  const pinnedConnection =
    pinnedConnectionId == null ? null : (connectionsById.get(pinnedConnectionId) ?? null);
  return pinnedConnection?.requestId === activeRequestId ? pinnedConnection : latestConnection;
});

const grpcEventsByConnectionIdAtom = atom((get) => {
  const eventsByConnectionId = new Map<string, GrpcEvent[]>();
  for (const event of get(grpcEventsAtom)) {
    const events = eventsByConnectionId.get(event.connectionId);
    if (events == null) {
      eventsByConnectionId.set(event.connectionId, [event]);
    } else {
      events.push(event);
    }
  }
  return eventsByConnectionId;
});

export function useGrpcEvents(connectionId: string | null) {
  const eventsByConnectionId = useAtomValue(grpcEventsByConnectionIdAtom);

  useEffect(() => {
    if (connectionId == null) {
      replaceModelsInStore("grpc_event", []);
      return;
    }

    // Fetch events from database, filtering out events from other connections and merging atomically
    fireAndForget(
      invoke<GrpcEvent[]>("models_grpc_events", { connectionId }).then((events) =>
        mergeModelsInStore("grpc_event", events, (e) => e.connectionId === connectionId),
      ),
    );
  }, [connectionId]);

  return connectionId == null ? [] : (eventsByConnectionId.get(connectionId) ?? []);
}
