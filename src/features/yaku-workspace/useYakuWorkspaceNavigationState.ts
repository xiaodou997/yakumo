import { useEffect, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { TreeHandle } from "../../components/core/tree/Tree";
import { useListenToTauriEvent } from "../../hooks/useListenToTauriEvent";
import {
  type YakuRunBody,
  type YakuRunEventKind,
  type YakuRunLifecycleEvent,
  yakuEventNames,
} from "../../lib/yaku-client";
import type { WorkspaceTreeItem, YakuWorkspaceSearch } from "./types";

export function useYakuWorkspaceLocalState() {
  const [eventKind, setEventKind] = useState<"all" | YakuRunEventKind>("all");
  const [selectedBodyId, setSelectedBodyId] = useState<string>("");
  const [selectedRunEventId, setSelectedRunEventId] = useState<number | null>(null);
  const [eventFocusContextLabel, setEventFocusContextLabel] = useState<string | null>(null);
  const treeRef = useRef<TreeHandle>(null);

  return {
    eventKind,
    setEventKind,
    selectedBodyId,
    setSelectedBodyId,
    selectedRunEventId,
    setSelectedRunEventId,
    eventFocusContextLabel,
    setEventFocusContextLabel,
    treeRef,
  };
}

export function useYakuWorkspaceNavigationEffects({
  search,
  setSearch,
  workspacesReady,
  selectedWorkspaceId,
  environmentsReady,
  selectedEnvironmentId,
  requestsReady,
  selectedRequestId,
  selectedFolderNode,
  selectedRequestNode,
  runsReady,
  selectedRunId,
  runBodies,
  setSelectedBodyId,
  setSelectedRunEventId,
  setEventFocusContextLabel,
  treeRef,
  invalidateRunData,
}: {
  search: YakuWorkspaceSearch;
  setSearch: (patch: Partial<YakuWorkspaceSearch>) => void;
  workspacesReady: boolean;
  selectedWorkspaceId: string | null | undefined;
  environmentsReady: boolean;
  selectedEnvironmentId: string | null | undefined;
  requestsReady: boolean;
  selectedRequestId: string | null | undefined;
  selectedFolderNode: WorkspaceTreeItem | null | undefined;
  selectedRequestNode: WorkspaceTreeItem | null | undefined;
  runsReady: boolean;
  selectedRunId: string | null | undefined;
  runBodies: YakuRunBody[];
  setSelectedBodyId: Dispatch<SetStateAction<string>>;
  setSelectedRunEventId: Dispatch<SetStateAction<number | null>>;
  setEventFocusContextLabel: Dispatch<SetStateAction<string | null>>;
  treeRef: RefObject<TreeHandle | null>;
  invalidateRunData: (runId: string, requestId: string) => Promise<unknown>;
}) {
  useEffect(() => {
    if (!workspacesReady) return;
    if (search.workspaceId !== selectedWorkspaceId) {
      setSearch({
        workspaceId: selectedWorkspaceId ?? undefined,
        folderId: undefined,
        requestId: undefined,
        runId: undefined,
        environmentId: undefined,
      });
    }
  }, [search.workspaceId, selectedWorkspaceId, setSearch, workspacesReady]);

  useEffect(() => {
    if (!environmentsReady) return;
    if (search.environmentId !== selectedEnvironmentId) {
      setSearch({ environmentId: selectedEnvironmentId ?? undefined });
    }
  }, [environmentsReady, search.environmentId, selectedEnvironmentId, setSearch]);

  useEffect(() => {
    if (!requestsReady) return;
    if (search.folderId != null) {
      if (search.requestId != null) {
        setSearch({ requestId: undefined, runId: undefined });
      }
      return;
    }
    if (search.requestId !== selectedRequestId) {
      setSearch({
        requestId: selectedRequestId ?? undefined,
        runId: undefined,
        folderId: undefined,
      });
    }
  }, [requestsReady, search.folderId, search.requestId, selectedRequestId, setSearch]);

  useEffect(() => {
    if (!requestsReady) return;
    if (search.folderId != null && selectedFolderNode == null) {
      setSearch({ folderId: undefined });
    }
  }, [requestsReady, search.folderId, selectedFolderNode, setSearch]);

  useEffect(() => {
    const selectedNodeId = selectedRequestNode?.id ?? selectedFolderNode?.id;
    if (selectedNodeId != null) {
      treeRef.current?.selectItem(selectedNodeId);
    }
  }, [selectedFolderNode?.id, selectedRequestNode?.id]);

  useEffect(() => {
    if (!runsReady) return;
    if (search.runId !== selectedRunId) {
      setSearch({ runId: selectedRunId ?? undefined });
    }
  }, [runsReady, search.runId, selectedRunId, setSearch]);

  useEffect(() => {
    const nextBodyId = preferredBodyId(runBodies);
    setSelectedBodyId((prev) =>
      runBodies.some((body) => body.id === prev) ? prev : (nextBodyId ?? ""),
    );
  }, [runBodies]);

  useEffect(() => {
    setSelectedRunEventId(null);
    setEventFocusContextLabel(null);
  }, [selectedRunId]);

  useListenToTauriEvent<YakuRunLifecycleEvent>(yakuEventNames.runLifecycle, ({ payload }) => {
    void invalidateRunData(payload.runId, payload.requestId);
  });
}

function preferredBodyId(bodies: YakuRunBody[]) {
  return bodies.find((body) => body.bodyRole === "response")?.id ?? bodies[0]?.id;
}
