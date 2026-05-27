import type {
  RequestGraphqlPayloadSectionProps,
  RequestHttpAuthSectionProps,
  RequestHttpBodySectionProps,
  RequestHttpConnectionSectionProps,
  RequestHttpCookieSectionProps,
  RequestHttpMethodSectionProps,
} from "./RequestHttpGraphqlTypes";
import type {
  RequestHttpGraphqlFieldsProps,
  RequestHttpGraphqlSectionsProps,
} from "./RequestHttpGraphqlTypes";

export function buildHttpGraphqlSectionProps({
  protocol,
  httpMethod,
  setHttpMethod,
  httpBody,
  setHttpBody,
  httpBodyMode,
  setHttpBodyMode,
  httpBodyFilePath,
  setHttpBodyFilePath,
  httpMultipartParts,
  setHttpMultipartParts,
  httpCookieJarId,
  setHttpCookieJarId,
  cookieJars,
  httpAuthType,
  setHttpAuthType,
  httpAuthUsername,
  setHttpAuthUsername,
  httpAuthPassword,
  setHttpAuthPassword,
  httpAuthToken,
  setHttpAuthToken,
  httpAuthPasswordSecretId,
  httpAuthTokenSecretId,
  graphqlQuery,
  setGraphqlQuery,
  graphqlVariables,
  setGraphqlVariables,
  graphqlOperationName,
  setGraphqlOperationName,
  headers,
  setHeaders,
  query,
  setQuery,
  followRedirects,
  setFollowRedirects,
  timeoutMs,
  setTimeoutMs,
}: RequestHttpGraphqlFieldsProps): RequestHttpGraphqlSectionsProps {
  const method: RequestHttpMethodSectionProps | null =
    protocol === "http"
      ? {
          httpMethod,
          setHttpMethod,
        }
      : null;

  const graphqlPayload: RequestGraphqlPayloadSectionProps | null =
    protocol === "graphql"
      ? {
          query: graphqlQuery,
          setQuery: setGraphqlQuery,
          variables: graphqlVariables,
          setVariables: setGraphqlVariables,
          operationName: graphqlOperationName,
          setOperationName: setGraphqlOperationName,
        }
      : null;

  const body: RequestHttpBodySectionProps | null =
    protocol === "http"
      ? {
          protocol,
          bodyMode: httpBodyMode,
          setBodyMode: setHttpBodyMode,
          body: httpBody,
          setBody: setHttpBody,
          bodyFilePath: httpBodyFilePath,
          setBodyFilePath: setHttpBodyFilePath,
          multipartParts: httpMultipartParts,
          setMultipartParts: setHttpMultipartParts,
        }
      : null;

  const auth: RequestHttpAuthSectionProps = {
    authType: httpAuthType,
    setAuthType: setHttpAuthType,
    username: httpAuthUsername,
    setUsername: setHttpAuthUsername,
    password: httpAuthPassword,
    setPassword: setHttpAuthPassword,
    token: httpAuthToken,
    setToken: setHttpAuthToken,
    passwordSecretId: httpAuthPasswordSecretId,
    tokenSecretId: httpAuthTokenSecretId,
  };

  const cookies: RequestHttpCookieSectionProps = {
    cookieJarId: httpCookieJarId,
    setCookieJarId: setHttpCookieJarId,
    cookieJars,
  };

  const connection: RequestHttpConnectionSectionProps = {
    headers,
    setHeaders,
    query,
    setQuery,
    followRedirects,
    setFollowRedirects,
    timeoutMs,
    setTimeoutMs,
  };

  return {
    method,
    body,
    graphqlPayload,
    auth,
    cookies,
    connection,
  };
}
