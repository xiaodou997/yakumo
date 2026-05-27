import type {
  RunPayloadComparison,
  RunPayloadSummary,
  RunProtocolComparison,
  RunProtocolSummary,
} from "./RunPanelsComparisonTypes";
import {
  formatCountTransition,
  formatOptionalStringTransition,
  formatStatusTransition,
} from "./RunPanelsComparisonFormatters";

export function compareRunProtocolSummaries(
  current: RunProtocolSummary,
  base: RunProtocolSummary,
): RunProtocolComparison {
  return {
    httpStatus: formatStatusTransition(base.httpStatusCode, current.httpStatusCode),
    httpResponses: formatCountTransition(base.httpResponseCount, current.httpResponseCount),
    grpcMessages: formatCountTransition(base.grpcMessageCount, current.grpcMessageCount),
    websocketFrames: formatCountTransition(base.websocketMessageCount, current.websocketMessageCount),
    websocketDirections: `sent ${formatCountTransition(
      base.websocketSentCount,
      current.websocketSentCount,
    )} · received ${formatCountTransition(base.websocketReceivedCount, current.websocketReceivedCount)}`,
    errors: formatCountTransition(base.errorCount, current.errorCount),
  };
}

export function compareRunPayloadSummaries(
  current: RunPayloadSummary,
  base: RunPayloadSummary,
): RunPayloadComparison {
  return {
    httpMethod: formatOptionalStringTransition(base.httpMethod, current.httpMethod, 36),
    httpUrl: formatOptionalStringTransition(base.httpUrl, current.httpUrl, 72),
    httpAuth: formatOptionalStringTransition(base.httpAuth, current.httpAuth, 36),
    httpBodyMode: formatOptionalStringTransition(base.httpBodyMode, current.httpBodyMode, 36),
    graphqlOperation: formatOptionalStringTransition(
      base.graphqlOperationName,
      current.graphqlOperationName,
      40,
    ),
    grpcMethod: formatOptionalStringTransition(base.grpcServiceMethod, current.grpcServiceMethod, 56),
    websocketFirstSent: formatOptionalStringTransition(
      base.websocketFirstSent,
      current.websocketFirstSent,
      48,
    ),
  };
}
