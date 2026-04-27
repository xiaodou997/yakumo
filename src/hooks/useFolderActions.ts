import { useQuery } from "@tanstack/react-query";
import type { Folder } from "@yakumo-internal/models";
import type {
  CallFolderActionRequest,
  FolderAction,
  GetFolderActionsResponse,
} from "@yakumo/features";
import { invokeCmd } from "../lib/tauri";

export type CallableFolderAction = Pick<FolderAction, "label" | "icon"> & {
  call: (folder: Folder) => Promise<void>;
};

const emptyActions: CallableFolderAction[] = [];

export function useFolderActions() {
  const actionsResult = useQuery<CallableFolderAction[]>({
    queryKey: ["folder_actions"],
    queryFn: () => getFolderActions(),
  });

  return actionsResult.data ?? emptyActions;
}

export async function getFolderActions() {
  const responses = await invokeCmd<GetFolderActionsResponse[]>("cmd_folder_actions");
  const actions = responses.flatMap((r) =>
    r.actions.map((a, i) => ({
      label: a.label,
      icon: a.icon,
      call: async (folder: Folder) => {
        const payload: CallFolderActionRequest = {
          index: i,
          sourceId: r.sourceId,
          args: { folder },
        };
        await invokeCmd("cmd_call_folder_action", { req: payload });
      },
    })),
  );

  return actions;
}
