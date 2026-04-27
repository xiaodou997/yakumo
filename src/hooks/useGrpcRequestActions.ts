import { useQuery } from "@tanstack/react-query";
import type { GrpcRequest } from "@yakumo-internal/models";
import type {
  CallGrpcRequestActionRequest,
  GetGrpcRequestActionsResponse,
  GrpcRequestAction,
} from "@yakumo/features";
import { invokeCmd } from "../lib/tauri";
import { getGrpcProtoFiles } from "./useGrpcProtoFiles";

export type CallableGrpcRequestAction = Pick<GrpcRequestAction, "label" | "icon"> & {
  call: (grpcRequest: GrpcRequest) => Promise<void>;
};

const emptyActions: CallableGrpcRequestAction[] = [];

export function useGrpcRequestActions() {
  const actionsResult = useQuery<CallableGrpcRequestAction[]>({
    queryKey: ["grpc_request_actions"],
    queryFn: () => getGrpcRequestActions(),
  });

  return actionsResult.data ?? emptyActions;
}

export async function getGrpcRequestActions() {
  const responses = await invokeCmd<GetGrpcRequestActionsResponse[]>("cmd_grpc_request_actions");

  return responses.flatMap((r) =>
    r.actions.map((a, i) => ({
      label: a.label,
      icon: a.icon,
      call: async (grpcRequest: GrpcRequest) => {
        const protoFiles = await getGrpcProtoFiles(grpcRequest.id);
        const payload: CallGrpcRequestActionRequest = {
          index: i,
          sourceId: r.sourceId,
          args: { grpcRequest, protoFiles },
        };
        await invokeCmd("cmd_call_grpc_request_action", { req: payload });
      },
    })),
  );
}
