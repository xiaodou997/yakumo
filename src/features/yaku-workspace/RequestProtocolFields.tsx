import type { ConfigPair } from "./types";
import { CheckboxField, PairListEditor, fieldClassName, textareaClassName } from "./RequestFieldPrimitives";
import {
  createMultipartPart,
  type MultipartPart,
  updateMultipartPart,
} from "./requestConfig";

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
  httpMultipartParts,
  setHttpMultipartParts,
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
  httpMultipartParts: MultipartPart[];
  setHttpMultipartParts: (parts: MultipartPart[]) => void;
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
        multipartParts={httpMultipartParts}
        setMultipartParts={setHttpMultipartParts}
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
  multipartParts,
  setMultipartParts,
}: {
  protocol: "http" | "graphql";
  bodyMode: string;
  setBodyMode: (value: string) => void;
  body: string;
  setBody: (value: string) => void;
  bodyFilePath: string;
  setBodyFilePath: (value: string) => void;
  multipartParts: MultipartPart[];
  setMultipartParts: (parts: MultipartPart[]) => void;
}) {
  const mode =
    bodyMode === "file" || bodyMode === "json" || bodyMode === "multipart" ? bodyMode : "text";
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
          <option value="multipart">Multipart</option>
        </select>
      </div>
      {mode === "file" ? (
        <input
          value={bodyFilePath}
          onChange={(event) => setBodyFilePath(event.target.value)}
          placeholder="/absolute/path/to/body.bin"
          className={`${fieldClassName} mt-3`}
        />
      ) : mode === "multipart" ? (
        <MultipartPartsEditor parts={multipartParts} setParts={setMultipartParts} />
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
      {mode === "multipart" ? (
        <div className="mt-2 text-[11px] text-text-subtle">
          File parts are read at send time. File contents are not stored in request config.
        </div>
      ) : null}
    </div>
  );
}

function MultipartPartsEditor({
  parts,
  setParts,
}: {
  parts: MultipartPart[];
  setParts: (parts: MultipartPart[]) => void;
}) {
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-text-subtlest">Parts</div>
        <button
          type="button"
          onClick={() => setParts([...parts, createMultipartPart()])}
          className="rounded-md border border-border-subtle px-2 py-1 text-[11px] text-text-subtle hover:bg-surface-highlight"
        >
          Add Part
        </button>
      </div>
      {parts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-subtle p-3 text-xs text-text-subtle">
          No multipart parts yet.
        </div>
      ) : (
        parts.map((part, index) => (
          <div
            key={part.id}
            className="grid gap-2 rounded-lg border border-border-subtle bg-surface-highlight/35 p-2"
          >
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_8rem_auto_auto]">
              <input
                value={part.name}
                onChange={(event) =>
                  updateMultipartPart(parts, setParts, part.id, { name: event.target.value })
                }
                placeholder="Field name"
                className={fieldClassName}
              />
              <select
                value={part.kind}
                onChange={(event) =>
                  updateMultipartPart(parts, setParts, part.id, {
                    kind: event.target.value === "file" ? "file" : "text",
                  })
                }
                className={fieldClassName}
              >
                <option value="text">Text</option>
                <option value="file">File</option>
              </select>
              <label className="flex items-center gap-2 whitespace-nowrap text-xs text-text-subtle">
                <input
                  type="checkbox"
                  checked={part.enabled !== false}
                  onChange={(event) =>
                    updateMultipartPart(parts, setParts, part.id, {
                      enabled: event.target.checked,
                    })
                  }
                />
                Enabled
              </label>
              <button
                type="button"
                onClick={() => setParts(parts.filter((_, currentIndex) => currentIndex !== index))}
                className="rounded-md border border-danger/40 px-2 py-1 text-[11px] text-danger hover:bg-danger/10"
              >
                Remove
              </button>
            </div>
            {part.kind === "file" ? (
              <div className="grid gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <input
                  value={part.filePath}
                  onChange={(event) =>
                    updateMultipartPart(parts, setParts, part.id, { filePath: event.target.value })
                  }
                  placeholder="/absolute/path/to/file"
                  className={fieldClassName}
                />
                <input
                  value={part.fileName}
                  onChange={(event) =>
                    updateMultipartPart(parts, setParts, part.id, { fileName: event.target.value })
                  }
                  placeholder="Filename override"
                  className={fieldClassName}
                />
                <input
                  value={part.contentType}
                  onChange={(event) =>
                    updateMultipartPart(parts, setParts, part.id, {
                      contentType: event.target.value,
                    })
                  }
                  placeholder="Content-Type"
                  className={fieldClassName}
                />
              </div>
            ) : (
              <textarea
                value={part.value}
                onChange={(event) =>
                  updateMultipartPart(parts, setParts, part.id, { value: event.target.value })
                }
                rows={2}
                placeholder="Text value"
                className={textareaClassName}
              />
            )}
          </div>
        ))
      )}
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
