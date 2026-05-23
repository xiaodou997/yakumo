import { useEffect, useState } from "react";
import type {
  YakuEnvironment,
  YakuProtocol,
  YakuRequest,
  YakuRequestNodePageItem,
} from "../../lib/yaku-client";
import {
  draftFromRequestConfig,
  type RequestConfigDraftController,
} from "./requestConfig";
import type { ConfigPair } from "./types";

export type RequestBuilderDraft = {
  parentId: string;
  setParentId: (value: string) => void;
  folderName: string;
  setFolderName: (value: string) => void;
  requestName: string;
  setRequestName: (value: string) => void;
  requestProtocol: YakuProtocol;
  setRequestProtocol: (value: YakuProtocol) => void;
  config: RequestConfigDraftController;
};

export type RequestEditDraft = {
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  configText: string;
  setConfigText: (value: string) => void;
  config: RequestConfigDraftController;
};

export function useYakuWorkspaceForms({
  selectedEnvironment,
  selectedFolderNode,
  selectedRequestNode,
  loadedRequest,
}: {
  selectedEnvironment: YakuEnvironment | null | undefined;
  selectedFolderNode: YakuRequestNodePageItem | null | undefined;
  selectedRequestNode: (YakuRequestNodePageItem & { requestId: string }) | null | undefined;
  loadedRequest: YakuRequest | null | undefined;
}) {
  const [workspaceName, setWorkspaceName] = useState("New Workspace");
  const [environmentName, setEnvironmentName] = useState("");
  const [environmentVariablesText, setEnvironmentVariablesText] = useState("{}");
  const [folderName, setFolderName] = useState("New Folder");
  const [folderEditName, setFolderEditName] = useState("");
  const [folderMoveParentId, setFolderMoveParentId] = useState("__root__");
  const [requestName, setRequestName] = useState("New Request");
  const [requestProtocol, setRequestProtocol] = useState<YakuProtocol>("http");
  const [requestUrl, setRequestUrl] = useState("https://example.com");
  const [requestHttpMethod, setRequestHttpMethod] = useState("GET");
  const [requestHttpBody, setRequestHttpBody] = useState("");
  const [requestHttpBodyMode, setRequestHttpBodyMode] = useState("text");
  const [requestHttpBodyFilePath, setRequestHttpBodyFilePath] = useState("");
  const [requestHttpAuthType, setRequestHttpAuthType] = useState("none");
  const [requestHttpAuthUsername, setRequestHttpAuthUsername] = useState("");
  const [requestHttpAuthPassword, setRequestHttpAuthPassword] = useState("");
  const [requestHttpAuthToken, setRequestHttpAuthToken] = useState("");
  const [requestHttpAuthPasswordSecretId, setRequestHttpAuthPasswordSecretId] = useState("");
  const [requestHttpAuthTokenSecretId, setRequestHttpAuthTokenSecretId] = useState("");
  const [requestHeaders, setRequestHeaders] = useState<ConfigPair[]>([]);
  const [requestQueryParams, setRequestQueryParams] = useState<ConfigPair[]>([]);
  const [requestFollowRedirects, setRequestFollowRedirects] = useState(true);
  const [requestTimeoutMs, setRequestTimeoutMs] = useState("");
  const [requestGrpcService, setRequestGrpcService] = useState("");
  const [requestGrpcMethod, setRequestGrpcMethod] = useState("");
  const [requestGrpcMessage, setRequestGrpcMessage] = useState("");
  const [requestGrpcMetadata, setRequestGrpcMetadata] = useState<ConfigPair[]>([]);
  const [requestGrpcProtoFiles, setRequestGrpcProtoFiles] = useState("");
  const [requestGrpcUseReflection, setRequestGrpcUseReflection] = useState(true);
  const [requestWebSocketMessages, setRequestWebSocketMessages] = useState("hello");
  const [requestWebSocketMaxMessages, setRequestWebSocketMaxMessages] = useState("1");
  const [requestParentId, setRequestParentId] = useState("__root__");
  const [requestMoveParentId, setRequestMoveParentId] = useState("__root__");
  const [requestEditName, setRequestEditName] = useState("");
  const [requestEditDescription, setRequestEditDescription] = useState("");
  const [requestConfigText, setRequestConfigText] = useState("{}");
  const [requestEditUrl, setRequestEditUrl] = useState("");
  const [requestEditHttpMethod, setRequestEditHttpMethod] = useState("GET");
  const [requestEditHttpBody, setRequestEditHttpBody] = useState("");
  const [requestEditHttpBodyMode, setRequestEditHttpBodyMode] = useState("text");
  const [requestEditHttpBodyFilePath, setRequestEditHttpBodyFilePath] = useState("");
  const [requestEditHttpAuthType, setRequestEditHttpAuthType] = useState("none");
  const [requestEditHttpAuthUsername, setRequestEditHttpAuthUsername] = useState("");
  const [requestEditHttpAuthPassword, setRequestEditHttpAuthPassword] = useState("");
  const [requestEditHttpAuthToken, setRequestEditHttpAuthToken] = useState("");
  const [requestEditHttpAuthPasswordSecretId, setRequestEditHttpAuthPasswordSecretId] =
    useState("");
  const [requestEditHttpAuthTokenSecretId, setRequestEditHttpAuthTokenSecretId] = useState("");
  const [requestEditHeaders, setRequestEditHeaders] = useState<ConfigPair[]>([]);
  const [requestEditQueryParams, setRequestEditQueryParams] = useState<ConfigPair[]>([]);
  const [requestEditFollowRedirects, setRequestEditFollowRedirects] = useState(true);
  const [requestEditTimeoutMs, setRequestEditTimeoutMs] = useState("");
  const [requestEditGrpcService, setRequestEditGrpcService] = useState("");
  const [requestEditGrpcMethod, setRequestEditGrpcMethod] = useState("");
  const [requestEditGrpcMessage, setRequestEditGrpcMessage] = useState("");
  const [requestEditGrpcMetadata, setRequestEditGrpcMetadata] = useState<ConfigPair[]>([]);
  const [requestEditGrpcProtoFiles, setRequestEditGrpcProtoFiles] = useState("");
  const [requestEditGrpcUseReflection, setRequestEditGrpcUseReflection] = useState(true);
  const [requestEditWebSocketMessages, setRequestEditWebSocketMessages] = useState("");
  const [requestEditWebSocketMaxMessages, setRequestEditWebSocketMaxMessages] = useState("1");

  useEffect(() => {
    setRequestMoveParentId(selectedRequestNode?.parentId ?? "__root__");
  }, [selectedRequestNode?.parentId]);

  useEffect(() => {
    setFolderMoveParentId(selectedFolderNode?.parentId ?? "__root__");
  }, [selectedFolderNode?.parentId]);

  useEffect(() => {
    setFolderEditName(selectedFolderNode?.name ?? "");
  }, [selectedFolderNode?.name]);

  useEffect(() => {
    setEnvironmentName(selectedEnvironment?.name ?? "New Environment");
    setEnvironmentVariablesText(JSON.stringify(selectedEnvironment?.variables ?? {}, null, 2));
  }, [selectedEnvironment]);

  useEffect(() => {
    setRequestUrl("https://example.com");
    setRequestHttpMethod(requestProtocol === "graphql" ? "POST" : "GET");
    setRequestHttpBody(requestProtocol === "graphql" ? '{"query":"{ __typename }"}' : "");
    setRequestHttpBodyMode(requestProtocol === "graphql" ? "json" : "text");
    setRequestHttpBodyFilePath("");
    setRequestHttpAuthType("none");
    setRequestHttpAuthUsername("");
    setRequestHttpAuthPassword("");
    setRequestHttpAuthToken("");
    setRequestHttpAuthPasswordSecretId("");
    setRequestHttpAuthTokenSecretId("");
    setRequestHeaders([]);
    setRequestQueryParams([]);
    setRequestFollowRedirects(true);
    setRequestTimeoutMs(requestProtocol === "web_socket" || requestProtocol === "grpc" ? "30000" : "");
    setRequestGrpcService("");
    setRequestGrpcMethod("");
    setRequestGrpcMessage("");
    setRequestGrpcMetadata([]);
    setRequestGrpcProtoFiles("");
    setRequestGrpcUseReflection(true);
    setRequestWebSocketMessages("hello");
    setRequestWebSocketMaxMessages("1");
  }, [requestProtocol]);

  useEffect(() => {
    if (loadedRequest == null) {
      setRequestEditName("");
      setRequestEditDescription("");
      setRequestConfigText("{}");
      return;
    }
    setRequestEditName(loadedRequest.name);
    setRequestEditDescription(loadedRequest.description);
    setRequestConfigText(JSON.stringify(loadedRequest.config, null, 2));
    const draft = draftFromRequestConfig(loadedRequest.protocol, loadedRequest.config);
    setRequestEditUrl(draft.url);
    setRequestEditHttpMethod(draft.httpMethod);
    setRequestEditHttpBody(draft.httpBody);
    setRequestEditHttpBodyMode(draft.httpBodyMode);
    setRequestEditHttpBodyFilePath(draft.httpBodyFilePath);
    setRequestEditHttpAuthType(draft.httpAuthType);
    setRequestEditHttpAuthUsername(draft.httpAuthUsername);
    setRequestEditHttpAuthPassword(draft.httpAuthPassword);
    setRequestEditHttpAuthToken(draft.httpAuthToken);
    setRequestEditHttpAuthPasswordSecretId(draft.httpAuthPasswordSecretId);
    setRequestEditHttpAuthTokenSecretId(draft.httpAuthTokenSecretId);
    setRequestEditHeaders(draft.headers);
    setRequestEditQueryParams(draft.query);
    setRequestEditFollowRedirects(draft.followRedirects);
    setRequestEditTimeoutMs(draft.timeoutMs);
    setRequestEditGrpcService(draft.grpcService);
    setRequestEditGrpcMethod(draft.grpcMethod);
    setRequestEditGrpcMessage(draft.grpcMessage);
    setRequestEditGrpcMetadata(draft.grpcMetadata);
    setRequestEditGrpcProtoFiles(draft.grpcProtoFiles);
    setRequestEditGrpcUseReflection(draft.grpcUseReflection);
    setRequestEditWebSocketMessages(draft.webSocketMessages);
    setRequestEditWebSocketMaxMessages(draft.webSocketMaxMessages);
  }, [loadedRequest]);

  const requestConfigDraft: RequestConfigDraftController = {
    url: requestUrl,
    setUrl: setRequestUrl,
    httpMethod: requestHttpMethod,
    setHttpMethod: setRequestHttpMethod,
    httpBody: requestHttpBody,
    setHttpBody: setRequestHttpBody,
    httpBodyMode: requestHttpBodyMode,
    setHttpBodyMode: setRequestHttpBodyMode,
    httpBodyFilePath: requestHttpBodyFilePath,
    setHttpBodyFilePath: setRequestHttpBodyFilePath,
    httpAuthType: requestHttpAuthType,
    setHttpAuthType: setRequestHttpAuthType,
    httpAuthUsername: requestHttpAuthUsername,
    setHttpAuthUsername: setRequestHttpAuthUsername,
    httpAuthPassword: requestHttpAuthPassword,
    setHttpAuthPassword: setRequestHttpAuthPassword,
    httpAuthToken: requestHttpAuthToken,
    setHttpAuthToken: setRequestHttpAuthToken,
    httpAuthPasswordSecretId: requestHttpAuthPasswordSecretId,
    setHttpAuthPasswordSecretId: setRequestHttpAuthPasswordSecretId,
    httpAuthTokenSecretId: requestHttpAuthTokenSecretId,
    setHttpAuthTokenSecretId: setRequestHttpAuthTokenSecretId,
    headers: requestHeaders,
    setHeaders: setRequestHeaders,
    query: requestQueryParams,
    setQuery: setRequestQueryParams,
    followRedirects: requestFollowRedirects,
    setFollowRedirects: setRequestFollowRedirects,
    timeoutMs: requestTimeoutMs,
    setTimeoutMs: setRequestTimeoutMs,
    grpcService: requestGrpcService,
    setGrpcService: setRequestGrpcService,
    grpcMethod: requestGrpcMethod,
    setGrpcMethod: setRequestGrpcMethod,
    grpcMessage: requestGrpcMessage,
    setGrpcMessage: setRequestGrpcMessage,
    grpcMetadata: requestGrpcMetadata,
    setGrpcMetadata: setRequestGrpcMetadata,
    grpcProtoFiles: requestGrpcProtoFiles,
    setGrpcProtoFiles: setRequestGrpcProtoFiles,
    grpcUseReflection: requestGrpcUseReflection,
    setGrpcUseReflection: setRequestGrpcUseReflection,
    webSocketMessages: requestWebSocketMessages,
    setWebSocketMessages: setRequestWebSocketMessages,
    webSocketMaxMessages: requestWebSocketMaxMessages,
    setWebSocketMaxMessages: setRequestWebSocketMaxMessages,
  };
  const requestEditConfigDraft: RequestConfigDraftController = {
    url: requestEditUrl,
    setUrl: setRequestEditUrl,
    httpMethod: requestEditHttpMethod,
    setHttpMethod: setRequestEditHttpMethod,
    httpBody: requestEditHttpBody,
    setHttpBody: setRequestEditHttpBody,
    httpBodyMode: requestEditHttpBodyMode,
    setHttpBodyMode: setRequestEditHttpBodyMode,
    httpBodyFilePath: requestEditHttpBodyFilePath,
    setHttpBodyFilePath: setRequestEditHttpBodyFilePath,
    httpAuthType: requestEditHttpAuthType,
    setHttpAuthType: setRequestEditHttpAuthType,
    httpAuthUsername: requestEditHttpAuthUsername,
    setHttpAuthUsername: setRequestEditHttpAuthUsername,
    httpAuthPassword: requestEditHttpAuthPassword,
    setHttpAuthPassword: setRequestEditHttpAuthPassword,
    httpAuthToken: requestEditHttpAuthToken,
    setHttpAuthToken: setRequestEditHttpAuthToken,
    httpAuthPasswordSecretId: requestEditHttpAuthPasswordSecretId,
    setHttpAuthPasswordSecretId: setRequestEditHttpAuthPasswordSecretId,
    httpAuthTokenSecretId: requestEditHttpAuthTokenSecretId,
    setHttpAuthTokenSecretId: setRequestEditHttpAuthTokenSecretId,
    headers: requestEditHeaders,
    setHeaders: setRequestEditHeaders,
    query: requestEditQueryParams,
    setQuery: setRequestEditQueryParams,
    followRedirects: requestEditFollowRedirects,
    setFollowRedirects: setRequestEditFollowRedirects,
    timeoutMs: requestEditTimeoutMs,
    setTimeoutMs: setRequestEditTimeoutMs,
    grpcService: requestEditGrpcService,
    setGrpcService: setRequestEditGrpcService,
    grpcMethod: requestEditGrpcMethod,
    setGrpcMethod: setRequestEditGrpcMethod,
    grpcMessage: requestEditGrpcMessage,
    setGrpcMessage: setRequestEditGrpcMessage,
    grpcMetadata: requestEditGrpcMetadata,
    setGrpcMetadata: setRequestEditGrpcMetadata,
    grpcProtoFiles: requestEditGrpcProtoFiles,
    setGrpcProtoFiles: setRequestEditGrpcProtoFiles,
    grpcUseReflection: requestEditGrpcUseReflection,
    setGrpcUseReflection: setRequestEditGrpcUseReflection,
    webSocketMessages: requestEditWebSocketMessages,
    setWebSocketMessages: setRequestEditWebSocketMessages,
    webSocketMaxMessages: requestEditWebSocketMaxMessages,
    setWebSocketMaxMessages: setRequestEditWebSocketMaxMessages,
  };
  const requestBuilderDraft: RequestBuilderDraft = {
    parentId: requestParentId,
    setParentId: setRequestParentId,
    folderName,
    setFolderName,
    requestName,
    setRequestName,
    requestProtocol,
    setRequestProtocol,
    config: requestConfigDraft,
  };
  const requestEditDraft: RequestEditDraft = {
    name: requestEditName,
    setName: setRequestEditName,
    description: requestEditDescription,
    setDescription: setRequestEditDescription,
    configText: requestConfigText,
    setConfigText: setRequestConfigText,
    config: requestEditConfigDraft,
  };

  return {
    requestBuilderDraft,
    requestEditDraft,
    workspaceName,
    setWorkspaceName,
    environmentName,
    setEnvironmentName,
    environmentVariablesText,
    setEnvironmentVariablesText,
    folderName,
    setFolderName,
    folderEditName,
    setFolderEditName,
    folderMoveParentId,
    setFolderMoveParentId,
    requestName,
    setRequestName,
    requestProtocol,
    setRequestProtocol,
    requestUrl,
    setRequestUrl,
    requestHttpMethod,
    setRequestHttpMethod,
    requestHttpBody,
    setRequestHttpBody,
    requestHttpAuthType,
    setRequestHttpAuthType,
    requestHttpAuthUsername,
    setRequestHttpAuthUsername,
    requestHttpAuthPassword,
    setRequestHttpAuthPassword,
    requestHttpAuthToken,
    setRequestHttpAuthToken,
    requestHttpAuthPasswordSecretId,
    setRequestHttpAuthPasswordSecretId,
    requestHttpAuthTokenSecretId,
    setRequestHttpAuthTokenSecretId,
    requestHeaders,
    setRequestHeaders,
    requestQueryParams,
    setRequestQueryParams,
    requestFollowRedirects,
    setRequestFollowRedirects,
    requestTimeoutMs,
    setRequestTimeoutMs,
    requestGrpcService,
    setRequestGrpcService,
    requestGrpcMethod,
    setRequestGrpcMethod,
    requestGrpcMessage,
    setRequestGrpcMessage,
    requestGrpcMetadata,
    setRequestGrpcMetadata,
    requestGrpcProtoFiles,
    setRequestGrpcProtoFiles,
    requestGrpcUseReflection,
    setRequestGrpcUseReflection,
    requestWebSocketMessages,
    setRequestWebSocketMessages,
    requestWebSocketMaxMessages,
    setRequestWebSocketMaxMessages,
    requestParentId,
    setRequestParentId,
    requestMoveParentId,
    setRequestMoveParentId,
    requestEditName,
    setRequestEditName,
    requestEditDescription,
    setRequestEditDescription,
    requestConfigText,
    setRequestConfigText,
    requestEditUrl,
    setRequestEditUrl,
    requestEditHttpMethod,
    setRequestEditHttpMethod,
    requestEditHttpBody,
    setRequestEditHttpBody,
    requestEditHttpAuthType,
    setRequestEditHttpAuthType,
    requestEditHttpAuthUsername,
    setRequestEditHttpAuthUsername,
    requestEditHttpAuthPassword,
    setRequestEditHttpAuthPassword,
    requestEditHttpAuthToken,
    setRequestEditHttpAuthToken,
    requestEditHttpAuthPasswordSecretId,
    setRequestEditHttpAuthPasswordSecretId,
    requestEditHttpAuthTokenSecretId,
    setRequestEditHttpAuthTokenSecretId,
    requestEditHeaders,
    setRequestEditHeaders,
    requestEditQueryParams,
    setRequestEditQueryParams,
    requestEditFollowRedirects,
    setRequestEditFollowRedirects,
    requestEditTimeoutMs,
    setRequestEditTimeoutMs,
    requestEditGrpcService,
    setRequestEditGrpcService,
    requestEditGrpcMethod,
    setRequestEditGrpcMethod,
    requestEditGrpcMessage,
    setRequestEditGrpcMessage,
    requestEditGrpcMetadata,
    setRequestEditGrpcMetadata,
    requestEditGrpcProtoFiles,
    setRequestEditGrpcProtoFiles,
    requestEditGrpcUseReflection,
    setRequestEditGrpcUseReflection,
    requestEditWebSocketMessages,
    setRequestEditWebSocketMessages,
    requestEditWebSocketMaxMessages,
    setRequestEditWebSocketMaxMessages,
  };
}
