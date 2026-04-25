import type { WebsocketRequest } from "@yakumo-internal/models";
import { deleteWebsocketConnections as cmdDeleteWebsocketConnections } from "@yakumo-internal/ws";
import { createFastMutation } from "../hooks/useFastMutation";

export const deleteWebsocketConnections = createFastMutation({
  mutationKey: ["delete_websocket_connections"],
  mutationFn: async (request: WebsocketRequest) => cmdDeleteWebsocketConnections(request.id),
});
