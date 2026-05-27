import { ComparisonJumpChip } from "./RunPanelsCompareShared";
import { RunComparisonSectionShell } from "./RunComparisonSectionShell";
import type { EventJumpBuilder } from "./RunComparisonSectionTypes";
import type {
  RunPayloadComparison,
  RunPayloadSummary,
} from "./RunPanelsComparisonModel";

export function RunComparisonRequestSummarySection({
  isReady,
  comparison,
  currentPayloadSummary,
  basePayloadSummary,
  openCurrentEvent,
  openBaselineEvent,
}: {
  isReady: boolean;
  comparison: RunPayloadComparison;
  currentPayloadSummary: RunPayloadSummary;
  basePayloadSummary: RunPayloadSummary;
  openCurrentEvent: EventJumpBuilder;
  openBaselineEvent: EventJumpBuilder;
}) {
  return (
    <RunComparisonSectionShell
      title="Request Summary"
      isReady={isReady}
      loadingLabel="Loading request summary..."
    >
      <>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <ComparisonJumpChip
            label="HTTP Method"
            value={comparison.httpMethod}
            onOpenCurrent={openCurrentEvent(
              currentPayloadSummary.httpRequestHeadersEventId,
              "Request Summary · HTTP Method · Current",
            )}
            onOpenBaseline={openBaselineEvent(
              basePayloadSummary.httpRequestHeadersEventId,
              "Request Summary · HTTP Method · Baseline",
            )}
          />
          <ComparisonJumpChip
            label="HTTP URL"
            value={comparison.httpUrl}
            onOpenCurrent={openCurrentEvent(
              currentPayloadSummary.httpRequestHeadersEventId,
              "Request Summary · HTTP URL · Current",
            )}
            onOpenBaseline={openBaselineEvent(
              basePayloadSummary.httpRequestHeadersEventId,
              "Request Summary · HTTP URL · Baseline",
            )}
          />
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <ComparisonJumpChip
            label="Auth"
            value={comparison.httpAuth}
            onOpenCurrent={openCurrentEvent(
              currentPayloadSummary.httpRequestHeadersEventId,
              "Request Summary · Auth · Current",
            )}
            onOpenBaseline={openBaselineEvent(
              basePayloadSummary.httpRequestHeadersEventId,
              "Request Summary · Auth · Baseline",
            )}
          />
          <ComparisonJumpChip
            label="Body Mode"
            value={comparison.httpBodyMode}
            onOpenCurrent={openCurrentEvent(
              currentPayloadSummary.requestBodyEventId,
              "Request Summary · Body Mode · Current",
            )}
            onOpenBaseline={openBaselineEvent(
              basePayloadSummary.requestBodyEventId,
              "Request Summary · Body Mode · Baseline",
            )}
          />
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <ComparisonJumpChip
            label="GraphQL Op"
            value={comparison.graphqlOperation}
            onOpenCurrent={openCurrentEvent(
              currentPayloadSummary.requestBodyEventId,
              "Request Summary · GraphQL Op · Current",
            )}
            onOpenBaseline={openBaselineEvent(
              basePayloadSummary.requestBodyEventId,
              "Request Summary · GraphQL Op · Baseline",
            )}
          />
          <ComparisonJumpChip
            label="gRPC Method"
            value={comparison.grpcMethod}
            onOpenCurrent={openCurrentEvent(
              currentPayloadSummary.grpcRequestHeaderEventId,
              "Request Summary · gRPC Method · Current",
            )}
            onOpenBaseline={openBaselineEvent(
              basePayloadSummary.grpcRequestHeaderEventId,
              "Request Summary · gRPC Method · Baseline",
            )}
          />
          <ComparisonJumpChip
            label="WS First Sent"
            value={comparison.websocketFirstSent}
            onOpenCurrent={openCurrentEvent(
              currentPayloadSummary.websocketFirstSentEventId,
              "Request Summary · WS First Sent · Current",
            )}
            onOpenBaseline={openBaselineEvent(
              basePayloadSummary.websocketFirstSentEventId,
              "Request Summary · WS First Sent · Baseline",
            )}
          />
        </div>
      </>
    </RunComparisonSectionShell>
  );
}
