import type {
  RunFailureComparison,
  RunFailureDiffEntry,
  RunFailureSummary,
} from "./RunPanelsComparisonTypes";
import { formatOptionalStringTransition } from "./RunPanelsComparisonFormatters";

export function compareRunFailureSummaries(
  current: RunFailureSummary,
  base: RunFailureSummary,
): RunFailureComparison {
  return {
    lastHttpResponse: formatOptionalStringTransition(
      base.lastHttpResponse,
      current.lastHttpResponse,
      48,
    ),
    lastError: formatOptionalStringTransition(base.lastError, current.lastError, 72),
    lastGrpcMessage: formatOptionalStringTransition(
      base.lastGrpcMessage,
      current.lastGrpcMessage,
      64,
    ),
    lastWebSocketMessage: formatOptionalStringTransition(
      base.lastWebSocketMessage,
      current.lastWebSocketMessage,
      56,
    ),
  };
}

export function buildRunFailureDiffEntries(
  current: RunFailureSummary,
  base: RunFailureSummary,
): RunFailureDiffEntry[] {
  return [
    {
      label: "Error",
      summary: summarizeFailureSignalDiff(base.lastError, current.lastError),
      severityClassName: current.lastError == null ? "text-text-subtle" : "text-danger",
      currentEventId: current.lastErrorEventId,
      baseEventId: base.lastErrorEventId,
    },
    {
      label: "HTTP",
      summary: summarizeFailureSignalDiff(base.lastHttpResponse, current.lastHttpResponse),
      severityClassName:
        current.lastHttpResponse == null ? "text-text-subtle" : "text-text",
      currentEventId: current.lastHttpResponseEventId,
      baseEventId: base.lastHttpResponseEventId,
    },
    {
      label: "gRPC",
      summary: summarizeFailureSignalDiff(base.lastGrpcMessage, current.lastGrpcMessage),
      severityClassName:
        current.lastGrpcMessage == null ? "text-text-subtle" : "text-text",
      currentEventId: current.lastGrpcMessageEventId,
      baseEventId: base.lastGrpcMessageEventId,
    },
    {
      label: "WS",
      summary: summarizeFailureSignalDiff(base.lastWebSocketMessage, current.lastWebSocketMessage),
      severityClassName:
        current.lastWebSocketMessage == null ? "text-text-subtle" : "text-text",
      currentEventId: current.lastWebSocketMessageEventId,
      baseEventId: base.lastWebSocketMessageEventId,
    },
  ].filter((entry) => entry.summary !== "unchanged");
}

export function summarizeFailureSignalDiff(base: string | null, current: string | null) {
  if (base == null && current == null) {
    return "unchanged";
  }
  if (base == null && current != null) {
    return `new: ${current}`;
  }
  if (base != null && current == null) {
    return `cleared: ${base}`;
  }
  if (base === current) {
    return "unchanged";
  }
  return `${base ?? "none"} → ${current ?? "none"}`;
}

export function buildRunFailureSummaryLabel(summary: RunFailureSummary | null) {
  if (summary == null) {
    return "unknown";
  }
  if (summary.lastError != null) {
    return "error";
  }
  if (summary.lastHttpResponse != null) {
    return "http";
  }
  if (summary.lastGrpcMessage != null) {
    return "grpc";
  }
  if (summary.lastWebSocketMessage != null) {
    return "ws";
  }
  return "clean";
}

export function getFocusedSignalLabel(
  summary: RunFailureSummary,
  selectedEventId: number | null,
) {
  if (selectedEventId == null) {
    return null;
  }
  if (summary.lastHttpResponseEventId === selectedEventId) {
    return "Last HTTP Response";
  }
  if (summary.lastErrorEventId === selectedEventId) {
    return "Last Error";
  }
  if (summary.lastGrpcMessageEventId === selectedEventId) {
    return "Last gRPC Message";
  }
  if (summary.lastWebSocketMessageEventId === selectedEventId) {
    return "Last WS Message";
  }
  return null;
}
