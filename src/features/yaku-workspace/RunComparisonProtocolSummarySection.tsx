import { ComparisonJumpChip } from "./RunPanelsCompareShared";
import { RunComparisonSectionShell } from "./RunComparisonSectionShell";
import type { EventJumpBuilder } from "./RunComparisonSectionTypes";
import type {
  RunFailureSummary,
  RunProtocolComparison,
} from "./RunPanelsComparisonModel";

export function RunComparisonProtocolSummarySection({
  isReady,
  comparison,
  currentFailureSummary,
  baseFailureSummary,
  openCurrentEvent,
  openBaselineEvent,
}: {
  isReady: boolean;
  comparison: RunProtocolComparison;
  currentFailureSummary: RunFailureSummary;
  baseFailureSummary: RunFailureSummary;
  openCurrentEvent: EventJumpBuilder;
  openBaselineEvent: EventJumpBuilder;
}) {
  return (
    <RunComparisonSectionShell
      title="Protocol Summary"
      isReady={isReady}
      loadingLabel="Loading protocol summary..."
    >
      <>
        <div className="mt-2 grid gap-2 md:grid-cols-4">
          <ComparisonJumpChip
            label="HTTP Status"
            value={comparison.httpStatus}
            onOpenCurrent={openCurrentEvent(
              currentFailureSummary.lastHttpResponseEventId,
              "Protocol Summary · HTTP Status · Current",
            )}
            onOpenBaseline={openBaselineEvent(
              baseFailureSummary.lastHttpResponseEventId,
              "Protocol Summary · HTTP Status · Baseline",
            )}
          />
          <ComparisonJumpChip
            label="gRPC Messages"
            value={comparison.grpcMessages}
            onOpenCurrent={openCurrentEvent(
              currentFailureSummary.lastGrpcMessageEventId,
              "Protocol Summary · gRPC Messages · Current",
            )}
            onOpenBaseline={openBaselineEvent(
              baseFailureSummary.lastGrpcMessageEventId,
              "Protocol Summary · gRPC Messages · Baseline",
            )}
          />
          <ComparisonJumpChip
            label="WS Frames"
            value={comparison.websocketFrames}
            onOpenCurrent={openCurrentEvent(
              currentFailureSummary.lastWebSocketMessageEventId,
              "Protocol Summary · WS Frames · Current",
            )}
            onOpenBaseline={openBaselineEvent(
              baseFailureSummary.lastWebSocketMessageEventId,
              "Protocol Summary · WS Frames · Baseline",
            )}
          />
          <ComparisonJumpChip
            label="Errors"
            value={comparison.errors}
            onOpenCurrent={openCurrentEvent(
              currentFailureSummary.lastErrorEventId,
              "Protocol Summary · Errors · Current",
            )}
            onOpenBaseline={openBaselineEvent(
              baseFailureSummary.lastErrorEventId,
              "Protocol Summary · Errors · Baseline",
            )}
          />
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <ComparisonJumpChip
            label="HTTP Responses"
            value={comparison.httpResponses}
            onOpenCurrent={openCurrentEvent(
              currentFailureSummary.lastHttpResponseEventId,
              "Protocol Summary · HTTP Responses · Current",
            )}
            onOpenBaseline={openBaselineEvent(
              baseFailureSummary.lastHttpResponseEventId,
              "Protocol Summary · HTTP Responses · Baseline",
            )}
          />
          <ComparisonJumpChip
            label="WS Direction"
            value={comparison.websocketDirections}
            onOpenCurrent={openCurrentEvent(
              currentFailureSummary.lastWebSocketMessageEventId,
              "Protocol Summary · WS Direction · Current",
            )}
            onOpenBaseline={openBaselineEvent(
              baseFailureSummary.lastWebSocketMessageEventId,
              "Protocol Summary · WS Direction · Baseline",
            )}
          />
        </div>
      </>
    </RunComparisonSectionShell>
  );
}
