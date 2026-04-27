import { invoke } from "@tauri-apps/api/core";
import type { WebsocketConnection, WebsocketEvent } from "@yakumo-internal/models";
import {
  mergeModelsInStore,
  replaceModelsInStore,
  websocketConnectionsAtom,
  websocketEventsAtom,
} from "@yakumo-internal/models";
import { atom, useAtomValue } from "jotai";
import { useEffect } from "react";
import { fireAndForget } from "../lib/fireAndForget";
import { atomWithKVStorage } from "../lib/atoms/atomWithKVStorage";
import { jotaiStore } from "../lib/jotai";
import { activeRequestIdAtom } from "./useActiveRequestId";

const pinnedWebsocketConnectionIdAtom = atomWithKVStorage<Record<string, string | null>>(
  "pinned-websocket-connection-ids",
  {},
);

function recordKey(activeRequestId: string | null, latestConnection: WebsocketConnection | null) {
  return `${activeRequestId}-${latestConnection?.id ?? "none"}`;
}

export const websocketConnectionsByRequestIdAtom = atom((get) => {
  const connectionsByRequestId = new Map<string, WebsocketConnection[]>();
  const connectionsById = new Map<string, WebsocketConnection>();
  for (const connection of get(websocketConnectionsAtom)) {
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

export const activeWebsocketConnectionsAtom = atom<WebsocketConnection[]>((get) => {
  const activeRequestId = get(activeRequestIdAtom) ?? "n/a";
  return get(websocketConnectionsByRequestIdAtom).connectionsByRequestId.get(activeRequestId) ?? [];
});

export const activeWebsocketConnectionAtom = atom<WebsocketConnection | null>((get) => {
  const activeRequestId = get(activeRequestIdAtom) ?? "n/a";
  const activeConnections = get(activeWebsocketConnectionsAtom);
  const latestConnection = activeConnections[0] ?? null;
  const { connectionsById } = get(websocketConnectionsByRequestIdAtom);
  const pinnedConnectionId = get(pinnedWebsocketConnectionIdAtom)[
    recordKey(activeRequestId, latestConnection)
  ];
  const pinnedConnection =
    pinnedConnectionId == null ? null : (connectionsById.get(pinnedConnectionId) ?? null);
  return pinnedConnection?.requestId === activeRequestId ? pinnedConnection : latestConnection;
});

export function setPinnedWebsocketConnectionId(id: string | null) {
  const activeRequestId = jotaiStore.get(activeRequestIdAtom);
  const activeConnections = jotaiStore.get(activeWebsocketConnectionsAtom);
  const latestConnection = activeConnections[0] ?? null;
  if (activeRequestId == null) return;
  jotaiStore.set(pinnedWebsocketConnectionIdAtom, (prev) => {
    return { ...prev, [recordKey(activeRequestId, latestConnection)]: id };
  });
}

const websocketEventsByConnectionIdAtom = atom((get) => {
  const eventsByConnectionId = new Map<string, WebsocketEvent[]>();
  for (const event of get(websocketEventsAtom)) {
    const events = eventsByConnectionId.get(event.connectionId);
    if (events == null) {
      eventsByConnectionId.set(event.connectionId, [event]);
    } else {
      events.push(event);
    }
  }
  return eventsByConnectionId;
});

export function useWebsocketEvents(connectionId: string | null) {
  const eventsByConnectionId = useAtomValue(websocketEventsByConnectionIdAtom);

  useEffect(() => {
    if (connectionId == null) {
      replaceModelsInStore("websocket_event", []);
      return;
    }

    // Fetch events from database, filtering out events from other connections and merging atomically
    fireAndForget(
      invoke<WebsocketEvent[]>("models_websocket_events", { connectionId }).then((events) =>
        mergeModelsInStore("websocket_event", events, (e) => e.connectionId === connectionId),
      ),
    );
  }, [connectionId]);

  return connectionId == null ? [] : (eventsByConnectionId.get(connectionId) ?? []);
}
