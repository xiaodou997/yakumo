import type { ReactNode } from "react";
import { Button } from "../../components/core/Button";
import { HStack, VStack } from "../../components/core/Stacks";
import type { YakuProtocol } from "../../lib/yaku-client";
import {
  createConfigPair,
  summarizeRequestConfig,
  updateConfigPair,
} from "./requestConfig";
import type { ConfigPair } from "./types";

const fieldClassName =
  "min-h-sm w-full rounded-md border border-border-subtle bg-surface px-2 text-xs font-mono text-text outline-none focus:border-border-focus placeholder:text-placeholder";

const textareaClassName =
  "w-full resize-y rounded-md border border-border-subtle bg-surface p-2 text-xs font-mono text-text outline-none focus:border-border-focus";

export function RequestStructuredEditor({
  protocol,
  url,
  setUrl,
  httpMethod,
  setHttpMethod,
  httpBody,
  setHttpBody,
  headers,
  setHeaders,
  query,
  setQuery,
  followRedirects,
  setFollowRedirects,
  timeoutMs,
  setTimeoutMs,
  grpcService,
  setGrpcService,
  grpcMethod,
  setGrpcMethod,
  grpcMessage,
  setGrpcMessage,
  grpcMetadata,
  setGrpcMetadata,
  grpcUseReflection,
  setGrpcUseReflection,
  webSocketMessages,
  setWebSocketMessages,
  webSocketMaxMessages,
  setWebSocketMaxMessages,
}: {
  protocol: YakuProtocol;
  url: string;
  setUrl: (value: string) => void;
  httpMethod: string;
  setHttpMethod: (value: string) => void;
  httpBody: string;
  setHttpBody: (value: string) => void;
  headers: ConfigPair[];
  setHeaders: (pairs: ConfigPair[]) => void;
  query: ConfigPair[];
  setQuery: (pairs: ConfigPair[]) => void;
  followRedirects: boolean;
  setFollowRedirects: (value: boolean) => void;
  timeoutMs: string;
  setTimeoutMs: (value: string) => void;
  grpcService: string;
  setGrpcService: (value: string) => void;
  grpcMethod: string;
  setGrpcMethod: (value: string) => void;
  grpcMessage: string;
  setGrpcMessage: (value: string) => void;
  grpcMetadata: ConfigPair[];
  setGrpcMetadata: (pairs: ConfigPair[]) => void;
  grpcUseReflection: boolean;
  setGrpcUseReflection: (value: boolean) => void;
  webSocketMessages: string;
  setWebSocketMessages: (value: string) => void;
  webSocketMaxMessages: string;
  setWebSocketMaxMessages: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-text-subtlest">
        Structured Config
      </div>
      <VStack space={2}>
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={protocol === "web_socket" ? "ws://example.com/socket" : "https://example.com"}
          className={fieldClassName}
        />
        {protocol === "http" || protocol === "graphql" ? (
          <>
            {protocol === "http" ? (
              <input
                value={httpMethod}
                onChange={(event) => setHttpMethod(event.target.value)}
                placeholder="GET"
                className={fieldClassName}
              />
            ) : null}
            <textarea
              value={httpBody}
              onChange={(event) => setHttpBody(event.target.value)}
              rows={5}
              placeholder={protocol === "graphql" ? '{"query":"{ __typename }"}' : "Request body"}
              className={textareaClassName}
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
        ) : null}
        {protocol === "sse" ? (
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
        ) : null}
        {protocol === "web_socket" ? (
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
        ) : null}
        {protocol === "grpc" ? (
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
        ) : null}
      </VStack>
    </div>
  );
}

export function PairListEditor({
  title,
  pairs,
  setPairs,
  includeEnabled = false,
  namePlaceholder,
  valuePlaceholder,
}: {
  title: string;
  pairs: ConfigPair[];
  setPairs: (pairs: ConfigPair[]) => void;
  includeEnabled?: boolean;
  namePlaceholder: string;
  valuePlaceholder: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <HStack justifyContent="between" alignItems="center" className="gap-2">
        <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">{title}</div>
        <Button
          size="2xs"
          variant="border"
          onClick={() => setPairs([...pairs, createConfigPair()])}
        >
          Add
        </Button>
      </HStack>
      <div className="mt-3 space-y-2">
        {pairs.length === 0 ? (
          <EmptyCopy>No rows yet.</EmptyCopy>
        ) : (
          pairs.map((pair, index) => (
            <div
              key={pair.id}
              className="grid gap-2 rounded-lg border border-border-subtle bg-surface-highlight/35 p-2 md:grid-cols-[1fr_1fr_auto]"
            >
              <input
                value={pair.name}
                onChange={(event) =>
                  updateConfigPair(pairs, setPairs, pair.id, { name: event.target.value })
                }
                placeholder={namePlaceholder}
                className={fieldClassName}
              />
              <div className="flex gap-2 max-md:flex-col">
                <input
                  value={pair.value}
                  onChange={(event) =>
                    updateConfigPair(pairs, setPairs, pair.id, { value: event.target.value })
                  }
                  placeholder={valuePlaceholder}
                  className={fieldClassName}
                />
                {includeEnabled ? (
                  <label className="flex items-center gap-2 whitespace-nowrap text-xs text-text-subtle">
                    <input
                      type="checkbox"
                      checked={pair.enabled !== false}
                      onChange={(event) =>
                        updateConfigPair(pairs, setPairs, pair.id, {
                          enabled: event.target.checked,
                        })
                      }
                    />
                    Enabled
                  </label>
                ) : null}
              </div>
              <Button
                size="2xs"
                variant="border"
                color="danger"
                onClick={() => setPairs(pairs.filter((_, currentIndex) => currentIndex !== index))}
              >
                Remove
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function RequestConfigSummary({
  protocol,
  config,
}: {
  protocol: YakuProtocol;
  config: Record<string, unknown>;
}) {
  const entries = summarizeRequestConfig(protocol, config);
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-text-subtlest">
        Protocol Summary
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.label} className="rounded-lg border border-border-subtle bg-surface-highlight/40 px-2 py-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">
              {entry.label}
            </div>
            <div className="mt-1 break-words text-xs text-text">{entry.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckboxField({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-subtle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {children}
    </label>
  );
}

function EmptyCopy({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-border-subtle p-3 text-xs text-text-subtle">{children}</div>;
}
