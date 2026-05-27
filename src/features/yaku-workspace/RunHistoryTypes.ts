import type { YakuRunPageItem } from "../../lib/yaku-client";

export type RunCompareMode = "previous" | "last_success" | "last_failed";
export type RunSort = "newest" | "oldest" | "slowest" | "fastest";
export type RunStateFilter = "all" | YakuRunPageItem["state"];

export type RunHistoryPanelProps = {
  runs: YakuRunPageItem[];
  selectedRunId: string;
  selectedEventId: number | null;
  error: unknown;
  onSelectRun: (runId: string) => void;
  onOpenEvent: (eventId: number, contextLabel?: string) => void;
  onOpenRunEvent: (runId: string, eventId: number, contextLabel?: string) => void;
  onClearEventFocus: () => void;
};
