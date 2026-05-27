import { useQuery } from "@tanstack/react-query";
import {
  getYakuRequest,
  getYakuRunBodyBytes,
  listYakuRunBodies,
  listYakuRunEvents,
  listYakuRunsForRequest,
  type YakuRunEventKind,
} from "../../lib/yaku-client";
import { resolveSelectedId } from "./useYakuWorkspaceQueryUtils";

export function useYakuWorkspaceRunQueries({
  selectedRequestId,
  requestedRunId,
  eventKind,
  selectedBodyId,
}: {
  selectedRequestId?: string;
  requestedRunId?: string;
  eventKind: "all" | YakuRunEventKind;
  selectedBodyId: string;
}) {
  const requestQuery = useQuery({
    enabled: selectedRequestId != null,
    queryKey: ["yaku", "request", selectedRequestId],
    queryFn: () => getYakuRequest(selectedRequestId!),
  });

  const runsQuery = useQuery({
    enabled: selectedRequestId != null,
    queryKey: ["yaku", "runs", "request", selectedRequestId],
    queryFn: () => listYakuRunsForRequest(selectedRequestId!),
    placeholderData: (prev) => prev,
    refetchInterval: (query) =>
      query.state.data?.items.some((run) => run.state === "running") ? 750 : false,
  });
  const runs = runsQuery.data?.items ?? [];
  const selectedRunId = resolveSelectedId(runs, requestedRunId);
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? null;
  const selectedRunIsRunning = selectedRun?.state === "running";

  const runEventsQuery = useQuery({
    enabled: selectedRunId != null,
    queryKey: ["yaku", "run-events", selectedRunId, eventKind],
    queryFn: () => listYakuRunEvents(selectedRunId!, eventKind === "all" ? null : eventKind),
    placeholderData: (prev) => prev,
    refetchInterval: selectedRunIsRunning ? 750 : false,
  });

  const runBodiesQuery = useQuery({
    enabled: selectedRunId != null,
    queryKey: ["yaku", "run-bodies", selectedRunId],
    queryFn: () => listYakuRunBodies(selectedRunId!),
    placeholderData: (prev) => prev,
    refetchInterval: selectedRunIsRunning ? 1000 : false,
  });
  const runBodies = runBodiesQuery.data ?? [];

  const runBodyBytesQuery = useQuery({
    enabled: selectedBodyId !== "",
    queryKey: ["yaku", "run-body-bytes", selectedBodyId],
    queryFn: () => getYakuRunBodyBytes(selectedBodyId),
  });

  return {
    requestQuery,
    runsQuery,
    runs,
    selectedRunId,
    selectedRun,
    selectedRunIsRunning,
    runEventsQuery,
    runBodiesQuery,
    runBodies,
    runBodyBytesQuery,
  };
}
