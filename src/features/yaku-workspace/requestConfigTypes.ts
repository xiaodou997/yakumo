import type { ConfigPair } from "./types";

export type MultipartPart = {
  id: string;
  name: string;
  kind: "text" | "file";
  value: string;
  filePath: string;
  fileName: string;
  contentType: string;
  enabled: boolean;
};

export type WebSocketMessageDraft = {
  id: string;
  kind: "text" | "ping" | "binary";
  value: string;
  enabled: boolean;
};

export type RequestConfigDraft = {
  url: string;
  httpMethod: string;
  httpBody: string;
  httpBodyMode: string;
  httpBodyFilePath: string;
  httpMultipartParts: MultipartPart[];
  httpCookieJarId: string;
  httpAuthType: string;
  httpAuthUsername: string;
  httpAuthPassword: string;
  httpAuthToken: string;
  httpAuthPasswordSecretId: string;
  httpAuthTokenSecretId: string;
  headers: ConfigPair[];
  query: ConfigPair[];
  followRedirects: boolean;
  timeoutMs: string;
  graphqlQuery: string;
  graphqlVariables: string;
  graphqlOperationName: string;
  grpcService: string;
  grpcMethod: string;
  grpcMessage: string;
  grpcMetadata: ConfigPair[];
  grpcProtoImportRoots: string;
  grpcProtoFiles: string;
  grpcUseReflection: boolean;
  webSocketMessageQueue: WebSocketMessageDraft[];
  webSocketMaxMessages: string;
};

export type RequestConfigDraftController = RequestConfigDraft & {
  setUrl: (value: string) => void;
  setHttpMethod: (value: string) => void;
  setHttpBody: (value: string) => void;
  setHttpBodyMode: (value: string) => void;
  setHttpBodyFilePath: (value: string) => void;
  setHttpMultipartParts: (parts: MultipartPart[]) => void;
  setHttpCookieJarId: (value: string) => void;
  setHttpAuthType: (value: string) => void;
  setHttpAuthUsername: (value: string) => void;
  setHttpAuthPassword: (value: string) => void;
  setHttpAuthToken: (value: string) => void;
  setHttpAuthPasswordSecretId: (value: string) => void;
  setHttpAuthTokenSecretId: (value: string) => void;
  setHeaders: (pairs: ConfigPair[]) => void;
  setQuery: (pairs: ConfigPair[]) => void;
  setFollowRedirects: (value: boolean) => void;
  setTimeoutMs: (value: string) => void;
  setGraphqlQuery: (value: string) => void;
  setGraphqlVariables: (value: string) => void;
  setGraphqlOperationName: (value: string) => void;
  setGrpcService: (value: string) => void;
  setGrpcMethod: (value: string) => void;
  setGrpcMessage: (value: string) => void;
  setGrpcMetadata: (pairs: ConfigPair[]) => void;
  setGrpcProtoImportRoots: (value: string) => void;
  setGrpcProtoFiles: (value: string) => void;
  setGrpcUseReflection: (value: boolean) => void;
  setWebSocketMessageQueue: (value: WebSocketMessageDraft[]) => void;
  setWebSocketMaxMessages: (value: string) => void;
};
