import type { ConfigPair } from "./types";
import type { MultipartPart } from "./requestConfig";
import type { YakuCookieJar } from "../../lib/yaku-client";

export type RequestHttpMethodSectionProps = {
  httpMethod: string;
  setHttpMethod: (value: string) => void;
};

export type RequestHttpBodySectionProps = {
  protocol: "http" | "graphql";
  bodyMode: string;
  setBodyMode: (value: string) => void;
  body: string;
  setBody: (value: string) => void;
  bodyFilePath: string;
  setBodyFilePath: (value: string) => void;
  multipartParts: MultipartPart[];
  setMultipartParts: (parts: MultipartPart[]) => void;
};

export type RequestGraphqlPayloadSectionProps = {
  query: string;
  setQuery: (value: string) => void;
  variables: string;
  setVariables: (value: string) => void;
  operationName: string;
  setOperationName: (value: string) => void;
};

export type RequestHttpCookieSectionProps = {
  cookieJarId: string;
  setCookieJarId: (value: string) => void;
  cookieJars: YakuCookieJar[];
};

export type RequestHttpAuthSectionProps = {
  authType: string;
  setAuthType: (value: string) => void;
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  token: string;
  setToken: (value: string) => void;
  passwordSecretId: string;
  tokenSecretId: string;
};

export type RequestHttpConnectionSectionProps = {
  headers: ConfigPair[];
  setHeaders: (pairs: ConfigPair[]) => void;
  query: ConfigPair[];
  setQuery: (pairs: ConfigPair[]) => void;
  followRedirects: boolean;
  setFollowRedirects: (value: boolean) => void;
  timeoutMs: string;
  setTimeoutMs: (value: string) => void;
};

export type RequestHttpGraphqlFieldsProps = {
  protocol: "http" | "graphql";
  httpMethod: string;
  setHttpMethod: (value: string) => void;
  httpBody: string;
  setHttpBody: (value: string) => void;
  httpBodyMode: string;
  setHttpBodyMode: (value: string) => void;
  httpBodyFilePath: string;
  setHttpBodyFilePath: (value: string) => void;
  httpMultipartParts: MultipartPart[];
  setHttpMultipartParts: (parts: MultipartPart[]) => void;
  httpCookieJarId: string;
  setHttpCookieJarId: (value: string) => void;
  cookieJars: RequestHttpCookieSectionProps["cookieJars"];
  httpAuthType: string;
  setHttpAuthType: (value: string) => void;
  httpAuthUsername: string;
  setHttpAuthUsername: (value: string) => void;
  httpAuthPassword: string;
  setHttpAuthPassword: (value: string) => void;
  httpAuthToken: string;
  setHttpAuthToken: (value: string) => void;
  httpAuthPasswordSecretId: string;
  httpAuthTokenSecretId: string;
  graphqlQuery: string;
  setGraphqlQuery: (value: string) => void;
  graphqlVariables: string;
  setGraphqlVariables: (value: string) => void;
  graphqlOperationName: string;
  setGraphqlOperationName: (value: string) => void;
  headers: ConfigPair[];
  setHeaders: (pairs: ConfigPair[]) => void;
  query: ConfigPair[];
  setQuery: (pairs: ConfigPair[]) => void;
  followRedirects: boolean;
  setFollowRedirects: (value: boolean) => void;
  timeoutMs: string;
  setTimeoutMs: (value: string) => void;
};

export type RequestHttpGraphqlSectionsProps = {
  method: RequestHttpMethodSectionProps | null;
  body: RequestHttpBodySectionProps | null;
  graphqlPayload: RequestGraphqlPayloadSectionProps | null;
  auth: RequestHttpAuthSectionProps;
  cookies: RequestHttpCookieSectionProps;
  connection: RequestHttpConnectionSectionProps;
};
