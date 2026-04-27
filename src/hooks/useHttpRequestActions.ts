import { useQuery } from "@tanstack/react-query";
import type { HttpRequest } from "@yakumo-internal/models";
import type {
  CallHttpRequestActionRequest,
  GetHttpRequestActionsResponse,
  HttpRequestAction,
} from "@yakumo/features";
import { invokeCmd } from "../lib/tauri";

export type CallableHttpRequestAction = Pick<HttpRequestAction, "label" | "icon"> & {
  call: (httpRequest: HttpRequest) => Promise<void>;
};

const emptyActions: CallableHttpRequestAction[] = [];

export function useHttpRequestActions() {
  const actionsResult = useQuery<CallableHttpRequestAction[]>({
    queryKey: ["http_request_actions"],
    queryFn: () => getHttpRequestActions(),
  });

  return actionsResult.data ?? emptyActions;
}

export async function getHttpRequestActions() {
  const responses = await invokeCmd<GetHttpRequestActionsResponse[]>("cmd_http_request_actions");
  const actions = responses.flatMap((r) =>
    r.actions.map((a, i) => ({
      label: a.label,
      icon: a.icon,
      call: async (httpRequest: HttpRequest) => {
        const payload: CallHttpRequestActionRequest = {
          index: i,
          sourceId: r.sourceId,
          args: { httpRequest },
        };
        await invokeCmd("cmd_call_http_request_action", { req: payload });
      },
    })),
  );

  return actions;
}
