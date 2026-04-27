import { useQuery } from "@tanstack/react-query";
import type { Workspace } from "@yakumo-internal/models";
import type {
  CallWorkspaceActionRequest,
  GetWorkspaceActionsResponse,
  WorkspaceAction,
} from "@yakumo/features";
import { invokeCmd } from "../lib/tauri";

export type CallableWorkspaceAction = Pick<WorkspaceAction, "label" | "icon"> & {
  call: (workspace: Workspace) => Promise<void>;
};

const emptyActions: CallableWorkspaceAction[] = [];

export function useWorkspaceActions() {
  const actionsResult = useQuery<CallableWorkspaceAction[]>({
    queryKey: ["workspace_actions"],
    queryFn: () => getWorkspaceActions(),
  });

  return actionsResult.data ?? emptyActions;
}

export async function getWorkspaceActions() {
  const responses = await invokeCmd<GetWorkspaceActionsResponse[]>("cmd_workspace_actions");
  const actions = responses.flatMap((r) =>
    r.actions.map((a, i) => ({
      label: a.label,
      icon: a.icon,
      call: async (workspace: Workspace) => {
        const payload: CallWorkspaceActionRequest = {
          index: i,
          sourceId: r.sourceId,
          args: { workspace },
        };
        await invokeCmd("cmd_call_workspace_action", { req: payload });
      },
    })),
  );

  return actions;
}
