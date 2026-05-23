import type { ConfigPair } from "./types";
import { CheckboxField, PairListEditor, fieldClassName, textareaClassName } from "./RequestFieldPrimitives";

export function HttpGraphqlFields({
  protocol,
  httpMethod,
  setHttpMethod,
  httpBody,
  setHttpBody,
  httpBodyMode,
  setHttpBodyMode,
  httpBodyFilePath,
  setHttpBodyFilePath,
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
  headers,
  setHeaders,
  query,
  setQuery,
  followRedirects,
  setFollowRedirects,
  timeoutMs,
  setTimeoutMs,
}: {
  protocol: "http" | "graphql";
  httpMethod: string;
  setHttpMethod: (value: string) => void;
  httpBody: string;
  setHttpBody: (value: string) => void;
  httpBodyMode: string;
  setHttpBodyMode: (value: string) => void;
  httpBodyFilePath: string;
  setHttpBodyFilePath: (value: string) => void;
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
  headers: ConfigPair[];
  setHeaders: (pairs: ConfigPair[]) => void;
  query: ConfigPair[];
  setQuery: (pairs: ConfigPair[]) => void;
  followRedirects: boolean;
  setFollowRedirects: (value: boolean) => void;
  timeoutMs: string;
  setTimeoutMs: (value: string) => void;
}) {
  return (
    <>
      {protocol === "http" ? (
        <input
          value={httpMethod}
          onChange={(event) => setHttpMethod(event.target.value)}
          placeholder="GET"
          className={fieldClassName}
        />
      ) : null}
      <HttpBodyFields
        protocol={protocol}
        bodyMode={httpBodyMode}
        setBodyMode={setHttpBodyMode}
        body={httpBody}
        setBody={setHttpBody}
        bodyFilePath={httpBodyFilePath}
        setBodyFilePath={setHttpBodyFilePath}
      />
      <HttpAuthFields
        authType={httpAuthType}
        setAuthType={setHttpAuthType}
        username={httpAuthUsername}
        setUsername={setHttpAuthUsername}
        password={httpAuthPassword}
        setPassword={setHttpAuthPassword}
        token={httpAuthToken}
        setToken={setHttpAuthToken}
        passwordSecretId={httpAuthPasswordSecretId}
        tokenSecretId={httpAuthTokenSecretId}
      />
      <PairListEditor
        title="Headers"
        pairs={headers}
        setPairs={setHeaders}
        namePlaceholder="Header"
        valuePlaceholder="Value"
      />
      <PairListEditor
        title="Query"
        pairs={query}
        setPairs={setQuery}
        includeEnabled
        namePlaceholder="Parameter"
        valuePlaceholder="Value"
      />
      <CheckboxField checked={followRedirects} onChange={setFollowRedirects}>
        Follow redirects
      </CheckboxField>
      <input
        value={timeoutMs}
        onChange={(event) => setTimeoutMs(event.target.value)}
        placeholder="Timeout ms"
        className={fieldClassName}
      />
    </>
  );
}

function HttpBodyFields({
  protocol,
  bodyMode,
  setBodyMode,
  body,
  setBody,
  bodyFilePath,
  setBodyFilePath,
}: {
  protocol: "http" | "graphql";
  bodyMode: string;
  setBodyMode: (value: string) => void;
  body: string;
  setBody: (value: string) => void;
  bodyFilePath: string;
  setBodyFilePath: (value: string) => void;
}) {
  const mode = bodyMode === "file" || bodyMode === "json" ? bodyMode : "text";
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">Body</div>
        <select
          value={mode}
          onChange={(event) => setBodyMode(event.target.value)}
          className={`${fieldClassName} w-auto min-w-32`}
        >
          <option value="text">Text</option>
          <option value="json">JSON</option>
          <option value="file">File</option>
        </select>
      </div>
      {mode === "file" ? (
        <input
          value={bodyFilePath}
          onChange={(event) => setBodyFilePath(event.target.value)}
          placeholder="/absolute/path/to/body.bin"
          className={`${fieldClassName} mt-3`}
        />
      ) : (
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          placeholder={protocol === "graphql" ? '{"query":"{ __typename }"}' : "Request body"}
          className={`${textareaClassName} mt-3`}
        />
      )}
      {mode === "file" ? (
        <div className="mt-2 text-[11px] text-text-subtle">
          File body is read at send time. The path is stored in request config; file contents are not.
        </div>
      ) : null}
    </div>
  );
}

function HttpAuthFields({
  authType,
  setAuthType,
  username,
  setUsername,
  password,
  setPassword,
  token,
  setToken,
  passwordSecretId,
  tokenSecretId,
}: {
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
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">Auth</div>
      <select
        value={authType}
        onChange={(event) => setAuthType(event.target.value)}
        className={`${fieldClassName} mt-3`}
      >
        <option value="none">None</option>
        <option value="basic">Basic</option>
        <option value="bearer">Bearer</option>
      </select>
      {authType === "basic" ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            className={fieldClassName}
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            className={fieldClassName}
          />
        </div>
      ) : null}
      {authType === "basic" && password === "" && passwordSecretId !== "" ? (
        <div className="mt-2 text-[11px] text-text-subtle">Password stored as secret.</div>
      ) : null}
      {authType === "bearer" ? (
        <input
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Bearer token"
          type="password"
          className={`${fieldClassName} mt-3`}
        />
      ) : null}
      {authType === "bearer" && token === "" && tokenSecretId !== "" ? (
        <div className="mt-2 text-[11px] text-text-subtle">Token stored as secret.</div>
      ) : null}
    </div>
  );
}

export function SseFields({
  headers,
  setHeaders,
  query,
  setQuery,
  followRedirects,
  setFollowRedirects,
  timeoutMs,
  setTimeoutMs,
}: {
  headers: ConfigPair[];
  setHeaders: (pairs: ConfigPair[]) => void;
  query: ConfigPair[];
  setQuery: (pairs: ConfigPair[]) => void;
  followRedirects: boolean;
  setFollowRedirects: (value: boolean) => void;
  timeoutMs: string;
  setTimeoutMs: (value: string) => void;
}) {
  return (
    <>
      <PairListEditor
        title="Headers"
        pairs={headers}
        setPairs={setHeaders}
        namePlaceholder="Header"
        valuePlaceholder="Value"
      />
      <PairListEditor
        title="Query"
        pairs={query}
        setPairs={setQuery}
        includeEnabled
        namePlaceholder="Parameter"
        valuePlaceholder="Value"
      />
      <CheckboxField checked={followRedirects} onChange={setFollowRedirects}>
        Follow redirects
      </CheckboxField>
      <input
        value={timeoutMs}
        onChange={(event) => setTimeoutMs(event.target.value)}
        placeholder="Timeout ms"
        className={fieldClassName}
      />
    </>
  );
}

export function WebSocketFields({
  headers,
  setHeaders,
  query,
  setQuery,
  webSocketMessages,
  setWebSocketMessages,
  webSocketMaxMessages,
  setWebSocketMaxMessages,
  timeoutMs,
  setTimeoutMs,
}: {
  headers: ConfigPair[];
  setHeaders: (pairs: ConfigPair[]) => void;
  query: ConfigPair[];
  setQuery: (pairs: ConfigPair[]) => void;
  webSocketMessages: string;
  setWebSocketMessages: (value: string) => void;
  webSocketMaxMessages: string;
  setWebSocketMaxMessages: (value: string) => void;
  timeoutMs: string;
  setTimeoutMs: (value: string) => void;
}) {
  return (
    <>
      <PairListEditor
        title="Headers"
        pairs={headers}
        setPairs={setHeaders}
        namePlaceholder="Header"
        valuePlaceholder="Value"
      />
      <PairListEditor
        title="Query"
        pairs={query}
        setPairs={setQuery}
        includeEnabled
        namePlaceholder="Parameter"
        valuePlaceholder="Value"
      />
      <textarea
        value={webSocketMessages}
        onChange={(event) => setWebSocketMessages(event.target.value)}
        rows={5}
        placeholder="One message per line"
        className={textareaClassName}
      />
      <input
        value={webSocketMaxMessages}
        onChange={(event) => setWebSocketMaxMessages(event.target.value)}
        placeholder="Max messages"
        className={fieldClassName}
      />
      <input
        value={timeoutMs}
        onChange={(event) => setTimeoutMs(event.target.value)}
        placeholder="Timeout ms"
        className={fieldClassName}
      />
    </>
  );
}

export function GrpcFields({
  grpcService,
  setGrpcService,
  grpcMethod,
  setGrpcMethod,
  grpcMessage,
  setGrpcMessage,
  grpcMetadata,
  setGrpcMetadata,
  grpcProtoFiles,
  setGrpcProtoFiles,
  grpcUseReflection,
  setGrpcUseReflection,
  timeoutMs,
  setTimeoutMs,
}: {
  grpcService: string;
  setGrpcService: (value: string) => void;
  grpcMethod: string;
  setGrpcMethod: (value: string) => void;
  grpcMessage: string;
  setGrpcMessage: (value: string) => void;
  grpcMetadata: ConfigPair[];
  setGrpcMetadata: (pairs: ConfigPair[]) => void;
  grpcProtoFiles: string;
  setGrpcProtoFiles: (value: string) => void;
  grpcUseReflection: boolean;
  setGrpcUseReflection: (value: boolean) => void;
  timeoutMs: string;
  setTimeoutMs: (value: string) => void;
}) {
  return (
    <>
      <input
        value={grpcService}
        onChange={(event) => setGrpcService(event.target.value)}
        placeholder="package.Service"
        className={fieldClassName}
      />
      <input
        value={grpcMethod}
        onChange={(event) => setGrpcMethod(event.target.value)}
        placeholder="Method"
        className={fieldClassName}
      />
      <textarea
        value={grpcMessage}
        onChange={(event) => setGrpcMessage(event.target.value)}
        rows={5}
        placeholder='{"ping":"pong"}'
        className={textareaClassName}
      />
      <PairListEditor
        title="Metadata"
        pairs={grpcMetadata}
        setPairs={setGrpcMetadata}
        namePlaceholder="Metadata"
        valuePlaceholder="Value"
      />
      <div className="rounded-xl border border-border-subtle bg-surface p-3">
        <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">Proto Files</div>
        <div className="mt-1 text-xs text-text-subtle">
          Optional when server reflection is enabled. Use one local proto path per line.
        </div>
        <textarea
          value={grpcProtoFiles}
          onChange={(event) => setGrpcProtoFiles(event.target.value)}
          rows={4}
          placeholder={"/absolute/path/to/service.proto\n/absolute/path/to/imports.proto"}
          className={`${textareaClassName} mt-3`}
        />
      </div>
      <CheckboxField checked={grpcUseReflection} onChange={setGrpcUseReflection}>
        Use reflection
      </CheckboxField>
      <input
        value={timeoutMs}
        onChange={(event) => setTimeoutMs(event.target.value)}
        placeholder="Timeout ms"
        className={fieldClassName}
      />
    </>
  );
}
