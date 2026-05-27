import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createYakuRequest,
  deleteYakuRequestNode,
  updateYakuRequest,
} from "../../lib/yaku-client";
import { buildRequestConfigDraft } from "./requestConfig";
import { parseJsonObject } from "./useYakuWorkspaceMutationUtils";
import type { YakuWorkspaceResourceMutationParams } from "./useYakuWorkspaceResourceMutationTypes";

export function useYakuWorkspaceRequestMutations({
  selectedWorkspaceId,
  selectedRequestId,
  selectedRequestNode,
  loadedRequest,
  requestBuilderDraft,
  requestEditDraft,
  setSearch,
}: Pick<
  YakuWorkspaceResourceMutationParams,
  | "selectedWorkspaceId"
  | "selectedRequestId"
  | "selectedRequestNode"
  | "loadedRequest"
  | "requestBuilderDraft"
  | "requestEditDraft"
  | "setSearch"
>) {
  const queryClient = useQueryClient();

  const createRequestMutation = useMutation({
    mutationFn: () => {
      if (selectedWorkspaceId == null) {
        throw new Error("No Yaku workspace selected");
      }
      return createYakuRequest({
        workspaceId: selectedWorkspaceId,
        name: requestBuilderDraft.requestName.trim() || "New Request",
        protocol: requestBuilderDraft.requestProtocol,
        parentId: requestBuilderDraft.parentId === "__root__" ? null : requestBuilderDraft.parentId,
        config: buildRequestConfigDraft({
          protocol: requestBuilderDraft.requestProtocol,
          ...requestBuilderDraft.config,
        }),
      });
    },
    onSuccess: async (request) => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "requests", selectedWorkspaceId] });
      setSearch({ requestId: request.id, runId: undefined, folderId: undefined });
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: (mode: "structured" | "raw" = "structured") => {
      if (selectedRequestId == null) {
        throw new Error("No Yaku request selected");
      }
      if (loadedRequest == null) {
        throw new Error("No Yaku request loaded");
      }
      return updateYakuRequest(selectedRequestId, {
        name: requestEditDraft.name.trim() || "Request",
        description: requestEditDraft.description,
        config:
          mode === "raw"
            ? parseJsonObject(requestEditDraft.configText, "Request config")
            : buildRequestConfigDraft({
                protocol: loadedRequest.protocol,
                ...requestEditDraft.config,
              }),
      });
    },
    onSuccess: async (request) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["yaku", "requests", selectedWorkspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "request", request.id] }),
      ]);
    },
  });

  const deleteRequestNodeMutation = useMutation({
    mutationFn: () => {
      if (selectedRequestNode == null) {
        throw new Error("No Yaku request node selected");
      }
      return deleteYakuRequestNode(selectedRequestNode.id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["yaku", "requests", selectedWorkspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "runs", "request", selectedRequestId] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "run-events"] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "run-bodies"] }),
      ]);
      setSearch({ requestId: undefined, runId: undefined, folderId: undefined });
    },
  });

  return {
    createRequestMutation,
    updateRequestMutation,
    deleteRequestNodeMutation,
  };
}
