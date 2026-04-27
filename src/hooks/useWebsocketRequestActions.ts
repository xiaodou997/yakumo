import { useQuery } from "@tanstack/react-query";
import type { WebsocketRequest } from "@yakumo-internal/models";
import type {
  CallWebsocketRequestActionRequest,
  GetWebsocketRequestActionsResponse,
  WebsocketRequestAction,
} from "@yakumo/features";
import { invokeCmd } from "../lib/tauri";

export type CallableWebSocketRequestAction = Pick<WebsocketRequestAction, "label" | "icon"> & {
  call: (request: WebsocketRequest) => Promise<void>;
};

const emptyActions: CallableWebSocketRequestAction[] = [];

export function useWebsocketRequestActions() {
  const actionsResult = useQuery<CallableWebSocketRequestAction[]>({
    queryKey: ["websocket_request_actions"],
    queryFn: () => getWebsocketRequestActions(),
  });

  return actionsResult.data ?? emptyActions;
}

export async function getWebsocketRequestActions() {
  const responses = await invokeCmd<GetWebsocketRequestActionsResponse[]>(
    "cmd_websocket_request_actions",
  );
  const actions = responses.flatMap((r) =>
    r.actions.map((a: WebsocketRequestAction, i: number) => ({
      label: a.label,
      icon: a.icon,
      call: async (websocketRequest: WebsocketRequest) => {
        const payload: CallWebsocketRequestActionRequest = {
          index: i,
          sourceId: r.sourceId,
          args: { websocketRequest },
        };
        await invokeCmd("cmd_call_websocket_request_action", { req: payload });
      },
    })),
  );

  return actions;
}
