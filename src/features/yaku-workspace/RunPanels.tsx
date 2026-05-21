import classNames from "classnames";
import { FormattedError } from "../../components/core/FormattedError";
import { Select } from "../../components/core/Select";
import { HStack, VStack } from "../../components/core/Stacks";
import {
  YAKU_RUN_EVENT_KIND_OPTIONS,
  type YakuRunEvent,
  type YakuRunEventKind,
  type YakuRunPageItem,
} from "../../lib/yaku-client";
import { EmptyCopy, WorkspacePanel } from "./WorkspacePanels";

export function RunHistoryPanel({
  runs,
  selectedRunId,
  error,
  onSelectRun,
}: {
  runs: YakuRunPageItem[];
  selectedRunId: string;
  error: unknown;
  onSelectRun: (runId: string) => void;
}) {
  return (
    <WorkspacePanel title="Run History" subtitle="Newest runs for the selected request.">
      {error ? (
        <FormattedError>{String(error)}</FormattedError>
      ) : runs.length === 0 ? (
        <EmptyCopy>Send the selected request to create the first Yaku run.</EmptyCopy>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => {
            const isActive = run.id === selectedRunId;
            return (
              <button
                key={run.id}
                type="button"
                onClick={() => onSelectRun(run.id)}
                className={classNames(
                  "grid w-full grid-cols-[1fr_auto] gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                  isActive
                    ? "border-border-focus bg-surface text-text"
                    : "border-border-subtle bg-surface-highlight/40 text-text-subtle hover:border-border hover:text-text",
                )}
              >
                <VStack space={1}>
                  <div className="font-medium">
                    {run.state}
                    {run.statusCode != null && ` · ${run.statusCode}`}
                  </div>
                  <div className="truncate text-xs text-text-subtlest">{run.id}</div>
                </VStack>
                <div className="text-right text-xs text-text-subtle">
                  {new Date(run.startedAt).toLocaleString()}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </WorkspacePanel>
  );
}

export function RunEventTimelinePanel({
  eventKind,
  setEventKind,
  events,
  error,
}: {
  eventKind: "all" | YakuRunEventKind;
  setEventKind: (kind: "all" | YakuRunEventKind) => void;
  events: YakuRunEvent[];
  error: unknown;
}) {
  return (
    <WorkspacePanel title="Event Timeline" subtitle="Unified run events emitted by the Yaku engine.">
      <VStack space={3}>
        <Select
          name="yaku-event-kind"
          label="Filter"
          value={eventKind}
          options={YAKU_RUN_EVENT_KIND_OPTIONS}
          onChange={(value) => setEventKind(value as "all" | YakuRunEventKind)}
        />
        {error ? (
          <FormattedError>{String(error)}</FormattedError>
        ) : events.length === 0 ? (
          <EmptyCopy>No events available for this run and filter.</EmptyCopy>
        ) : (
          <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
            {events.map((event) => (
              <div key={event.id} className="rounded-xl border border-border-subtle bg-surface px-3 py-3">
                <HStack justifyContent="between" alignItems="start" className="gap-3">
                  <div className="font-medium text-text">{event.kind}</div>
                  <div className="text-xs text-text-subtlest">#{event.sequence}</div>
                </HStack>
                <div className="mt-1 text-xs text-text-subtlest">
                  {new Date(event.createdAt).toLocaleString()}
                </div>
                <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-text-subtle">
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </VStack>
    </WorkspacePanel>
  );
}
