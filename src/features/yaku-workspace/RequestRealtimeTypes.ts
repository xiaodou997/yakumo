import type { ConfigPair } from "./types";
import type { WebSocketMessageDraft } from "./requestConfig";

export type RequestSseSectionProps = {
  headers: ConfigPair[];
  setHeaders: (pairs: ConfigPair[]) => void;
  query: ConfigPair[];
  setQuery: (pairs: ConfigPair[]) => void;
  followRedirects: boolean;
  setFollowRedirects: (value: boolean) => void;
  timeoutMs: string;
  setTimeoutMs: (value: string) => void;
};

export type RequestWebSocketHandshakeSectionProps = {
  headers: ConfigPair[];
  setHeaders: (pairs: ConfigPair[]) => void;
  query: ConfigPair[];
  setQuery: (pairs: ConfigPair[]) => void;
};

export type RequestWebSocketQueueSectionProps = {
  webSocketMessageQueue: WebSocketMessageDraft[];
  setWebSocketMessageQueue: (value: WebSocketMessageDraft[]) => void;
};

export type RequestWebSocketLimitsSectionProps = {
  webSocketMaxMessages: string;
  setWebSocketMaxMessages: (value: string) => void;
  timeoutMs: string;
  setTimeoutMs: (value: string) => void;
};
