import type { HttpRequest } from "@yakumo-internal/models";
import { patchModelById } from "@yakumo-internal/models";
import { createRequestAndNavigate } from "../lib/createRequestAndNavigate";
import { jotaiStore } from "../lib/jotai";
import { invokeCmd } from "../lib/tauri";
import { showToast } from "../lib/toast";
import { activeWorkspaceIdAtom } from "./useActiveWorkspace";
import { createFastMutation } from "./useFastMutation";
import { wasUpdatedExternally } from "./useRequestUpdateKey";

export const importCurl = createFastMutation<
  void,
  unknown,
  {
    overwriteRequestId?: string;
    command: string;
  }
>({
  mutationKey: ["import_curl"],
  mutationFn: async ({ overwriteRequestId, command }) => {
    const workspaceId = jotaiStore.get(activeWorkspaceIdAtom);
    const importedRequest: HttpRequest = await invokeCmd("cmd_curl_to_request", {
      command,
      workspaceId,
    });

    let verb: string;
    if (overwriteRequestId == null) {
      verb = "Created";
      await createRequestAndNavigate(importedRequest);
    } else {
      verb = "Updated";
      await patchModelById(importedRequest.model, overwriteRequestId, (r: HttpRequest) => ({
        ...importedRequest,
        id: r.id,
        createdAt: r.createdAt,
        workspaceId: r.workspaceId,
        folderId: r.folderId,
        name: r.name,
        sortPriority: r.sortPriority,
      }));

      setTimeout(() => wasUpdatedExternally(overwriteRequestId), 100);
    }

    showToast({
      color: "success",
      message: `${verb} request from Curl`,
    });
  },
});

export function useImportCurl() {
  return importCurl;
}
