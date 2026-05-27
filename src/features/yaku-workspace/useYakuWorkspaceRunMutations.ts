import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  cancelYakuRun,
  startYakuRun,
} from "../../lib/yaku-client";
import type { WorkspaceTreeItem } from "./types";
import type { YakuWorkspaceSearch } from "./types";

export function useYakuWorkspaceRunMutations({
  selectedRequestId,
  selectedRunId,
  selectedEnvironmentId,
  setSearch,
}: {
  selectedRequestId: string | null | undefined;
  selectedRunId: string | null | undefined;
  selectedEnvironmentId: string | null | undefined;
  setSearch: (patch: Partial<YakuWorkspaceSearch>) => void;
}) {
  const queryClient = useQueryClient();

  const invalidateRunData = useCallback(
    async (runId: string, requestId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["yaku", "runs", "request", requestId] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "run-events", runId] }),
        queryClient.invalidateQueries({ queryKey: ["yaku", "run-bodies", runId] }),
      ]);
    },
    [queryClient],
  );

  const startRunMutation = useMutation({
    mutationFn: async () => {
      if (selectedRequestId == null) {
        throw new Error("No Yaku request selected");
      }
      return startYakuRun(selectedRequestId, selectedEnvironmentId);
    },
    onSuccess: async (run) => {
      await invalidateRunData(run.id, run.requestId);
      setSearch({ runId: run.id });
    },
  });

  const cancelRunMutation = useMutation({
    mutationFn: async () => {
      if (selectedRunId == null) {
        throw new Error("No Yaku run selected");
      }
      return cancelYakuRun(selectedRunId);
    },
    onSuccess: async (run) => {
      await invalidateRunData(run.id, run.requestId);
    },
  });

  const startTreeRequestMutation = useMutation({
    mutationFn: (item: WorkspaceTreeItem) => {
      if (item.kind !== "request") {
        throw new Error("Only Yaku requests can be sent");
      }
      return startYakuRun(item.requestId ?? item.id, selectedEnvironmentId);
    },
    onSuccess: async (run, item) => {
      await invalidateRunData(run.id, run.requestId);
      setSearch({
        runId: run.id,
        requestId: item.kind === "request" ? (item.requestId ?? undefined) : undefined,
        folderId: undefined,
      });
    },
  });

  return {
    invalidateRunData,
    startRunMutation,
    cancelRunMutation,
    startTreeRequestMutation,
  };
}
