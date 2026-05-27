import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  clearYakuCookieJar,
  createYakuCookieJar,
  deleteYakuCookie,
  deleteYakuCookieJar,
} from "../../lib/yaku-client";
import type { RequestBuilderDraft, RequestEditDraft } from "./useYakuWorkspaceForms";
import type { YakuWorkspaceResourceMutationParams } from "./useYakuWorkspaceResourceMutationTypes";

export function useYakuWorkspaceCookieMutations({
  selectedWorkspaceId,
  selectedRequestId,
  cookieJarName,
  requestBuilderDraft,
  requestEditDraft,
}: Pick<
  YakuWorkspaceResourceMutationParams,
  | "selectedWorkspaceId"
  | "selectedRequestId"
  | "cookieJarName"
  | "requestBuilderDraft"
  | "requestEditDraft"
>) {
  const queryClient = useQueryClient();

  const createCookieJarMutation = useMutation({
    mutationFn: () => {
      if (selectedWorkspaceId == null) {
        throw new Error("No Yaku workspace selected");
      }
      return createYakuCookieJar(selectedWorkspaceId, cookieJarName.trim() || "Default");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "cookie-jars", selectedWorkspaceId] });
    },
  });

  const clearCookieJarMutation = useMutation({
    mutationFn: (jarId: string) => clearYakuCookieJar(jarId),
    onSuccess: async (_response, jarId) => {
      await queryClient.invalidateQueries({ queryKey: ["yaku", "cookie-jars", selectedWorkspaceId] });
      await queryClient.invalidateQueries({ queryKey: ["yaku", "cookies", jarId] });
    },
  });

  const deleteCookieMutation = useMutation({
    mutationFn: (input: { jarId: string; cookieId: string }) => deleteYakuCookie(input.cookieId),
    onSuccess: async (_response, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["yaku", "cookie-jars", selectedWorkspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "cookies", input.jarId] }),
      ]);
    },
  });

  const deleteCookieJarMutation = useMutation({
    mutationFn: (jarId: string) => deleteYakuCookieJar(jarId),
    onSuccess: async (_response, jarId) => {
      if (requestBuilderDraft.config.httpCookieJarId === jarId) {
        requestBuilderDraft.config.setHttpCookieJarId("");
      }
      if (requestEditDraft.config.httpCookieJarId === jarId) {
        requestEditDraft.config.setHttpCookieJarId("");
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["yaku", "cookie-jars", selectedWorkspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "cookies", jarId] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "requests", selectedWorkspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "request", selectedRequestId] }),
      ]);
    },
  });

  return {
    createCookieJarMutation,
    clearCookieJarMutation,
    deleteCookieMutation,
    deleteCookieJarMutation,
  };
}
