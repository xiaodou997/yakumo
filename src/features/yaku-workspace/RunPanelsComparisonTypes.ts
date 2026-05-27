import type { YakuRunEventKind } from "../../lib/yaku-client";

export type RunEventSummary = {
  total: number;
  counts: Record<YakuRunEventKind, number>;
  latestEventIds: Partial<Record<YakuRunEventKind, number>>;
};

export type RunEventComparison = {
  total: string;
  changedKinds: string;
  newKinds: string;
  removedKinds: string;
  diffs: Array<{
    kind: YakuRunEventKind;
    currentCount: number;
    baseCount: number;
    currentEventId: number | null;
    baseEventId: number | null;
    deltaLabel: string;
    deltaClassName: string;
  }>;
};

export type RunProtocolSummary = {
  httpStatusCode: number | null;
  httpResponseCount: number;
  grpcMessageCount: number;
  websocketMessageCount: number;
  websocketSentCount: number;
  websocketReceivedCount: number;
  errorCount: number;
};

export type RunProtocolComparison = {
  httpStatus: string;
  httpResponses: string;
  grpcMessages: string;
  websocketFrames: string;
  websocketDirections: string;
  errors: string;
};

export type RunPayloadSummary = {
  httpMethod: string | null;
  httpRequestHeadersEventId: number | null;
  httpUrl: string | null;
  httpAuth: string | null;
  httpBodyMode: string | null;
  requestBodyEventId: number | null;
  graphqlOperationName: string | null;
  grpcRequestHeaderEventId: number | null;
  grpcServiceMethod: string | null;
  websocketFirstSentEventId: number | null;
  websocketFirstSent: string | null;
};

export type RunPayloadComparison = {
  httpMethod: string;
  httpUrl: string;
  httpAuth: string;
  httpBodyMode: string;
  graphqlOperation: string;
  grpcMethod: string;
  websocketFirstSent: string;
};

export type RunFailureSummary = {
  lastHttpResponse: string | null;
  lastHttpResponseEventId: number | null;
  lastError: string | null;
  lastErrorEventId: number | null;
  lastGrpcMessage: string | null;
  lastGrpcMessageEventId: number | null;
  lastWebSocketMessage: string | null;
  lastWebSocketMessageEventId: number | null;
};

export type RunFailureComparison = {
  lastHttpResponse: string;
  lastError: string;
  lastGrpcMessage: string;
  lastWebSocketMessage: string;
};

export type RunFailureDiffEntry = {
  label: string;
  summary: string;
  severityClassName: string;
  currentEventId: number | null;
  baseEventId: number | null;
};
