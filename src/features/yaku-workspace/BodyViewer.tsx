import { useDeferredValue, useMemo, useState } from "react";
import { Button } from "../../components/core/Button";
import { FormattedError } from "../../components/core/FormattedError";
import { Select } from "../../components/core/Select";
import { HStack, VStack } from "../../components/core/Stacks";
import {
  isProbablyTextContentType,
  languageFromContent,
  languageFromContentType,
} from "../../lib/contentType";
import {
  decodeYakuBody,
  formatJsonIfPossible,
  type YakuRunBody,
} from "../../lib/yaku-client";
import { EmptyCopy } from "./WorkspacePanels";

const LARGE_TEXT_BODY_BYTES = 1024 * 1024;
const LARGE_IMAGE_BODY_BYTES = 5 * 1024 * 1024;

export function YakuBodyViewer({
  bodies,
  selectedBodyId,
  setSelectedBodyId,
  bodyBytes,
  isLoading,
  error,
}: {
  bodies: YakuRunBody[];
  selectedBodyId: string;
  setSelectedBodyId: (value: string) => void;
  bodyBytes?: number[];
  isLoading?: boolean;
  error: unknown;
}) {
  const [textMode, setTextMode] = useState<"pretty" | "raw">("pretty");
  const selectedBody = bodies.find((body) => body.id === selectedBodyId) ?? null;
  const bodyByteArray = useMemo(
    () => (bodyBytes == null ? null : Uint8Array.from(bodyBytes)),
    [bodyBytes],
  );
  const bodyText = useMemo(() => {
    if (bodyBytes == null) return "";
    return decodeYakuBody(bodyBytes);
  }, [bodyBytes]);
  const deferredBodyText = useDeferredValue(bodyText);
  const viewerKind = useMemo(
    () => inferBodyViewerKind(selectedBody, deferredBodyText),
    [deferredBodyText, selectedBody],
  );
  const renderedText = useMemo(() => {
    if (textMode === "pretty" && viewerKind === "json") {
      return formatJsonIfPossible(deferredBodyText);
    }
    return deferredBodyText;
  }, [deferredBodyText, textMode, viewerKind]);
  const previewLanguage = useMemo(
    () =>
      selectedBody?.contentType == null
        ? languageFromContent(renderedText, "text")
        : languageFromContentType(selectedBody.contentType, renderedText),
    [renderedText, selectedBody?.contentType],
  );
  const imageDataUrl = useMemo(() => {
    if (selectedBody == null || bodyByteArray == null || viewerKind !== "image") return null;
    if (selectedBody.byteLength > LARGE_IMAGE_BODY_BYTES) return null;
    return bytesToDataUrl(bodyByteArray, selectedBody.contentType ?? "application/octet-stream");
  }, [bodyByteArray, selectedBody, viewerKind]);

  return (
    <VStack space={3}>
      <Select
        name="yaku-run-body"
        label="Body"
        value={selectedBodyId || "__none__"}
        options={
          bodies.length === 0
            ? [{ label: "No Bodies", value: "__none__" }]
            : bodies.map((body) => ({
                label: `${body.bodyRole} · ${body.contentType ?? body.storageKind}`,
                value: body.id,
              }))
        }
        onChange={(value) => setSelectedBodyId(value === "__none__" ? "" : value)}
      />
      {error ? (
        <FormattedError>{String(error)}</FormattedError>
      ) : selectedBody == null ? (
        <EmptyCopy>No persisted body for this run.</EmptyCopy>
      ) : (
        <VStack space={2}>
          <div className="grid gap-2 md:grid-cols-3">
            <BodyMeta label="Role" value={selectedBody.bodyRole} />
            <BodyMeta label="Bytes" value={selectedBody.byteLength.toLocaleString()} />
            <BodyMeta label="Viewer" value={viewerKind} />
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <BodyMeta label="Content Type" value={selectedBody.contentType ?? "unknown"} />
            <BodyMeta label="Storage" value={selectedBody.storageKind} />
            <BodyMeta label="Language" value={previewLanguage ?? "binary"} />
          </div>
          <HStack space={2} wrap>
            <Button
              size="xs"
              variant={textMode === "pretty" ? "solid" : "border"}
              disabled={viewerKind !== "json"}
              onClick={() => setTextMode("pretty")}
            >
              Pretty
            </Button>
            <Button
              size="xs"
              variant={textMode === "raw" ? "solid" : "border"}
              disabled={viewerKind !== "json"}
              onClick={() => setTextMode("raw")}
            >
              Raw
            </Button>
            <Button
              size="xs"
              variant="border"
              disabled={bodyByteArray == null}
              onClick={() => {
                if (bodyByteArray != null) {
                  downloadBody(selectedBody, bodyByteArray);
                }
              }}
            >
              Download
            </Button>
          </HStack>
          {isLoading ? (
            <EmptyCopy>Loading body bytes...</EmptyCopy>
          ) : bodyByteArray == null ? (
            <EmptyCopy>Body bytes are not loaded yet.</EmptyCopy>
          ) : (
            <BodyPreview
              body={selectedBody}
              bodyBytes={bodyByteArray}
              imageDataUrl={imageDataUrl}
              renderedText={renderedText}
              viewerKind={viewerKind}
            />
          )}
        </VStack>
      )}
    </VStack>
  );
}

function BodyPreview({
  body,
  bodyBytes,
  imageDataUrl,
  renderedText,
  viewerKind,
}: {
  body: YakuRunBody;
  bodyBytes: Uint8Array;
  imageDataUrl: string | null;
  renderedText: string;
  viewerKind: BodyViewerKind;
}) {
  if (body.byteLength === 0) {
    return <EmptyCopy>Body is empty.</EmptyCopy>;
  }

  if (viewerKind === "image") {
    if (imageDataUrl == null) {
      return (
        <BinaryPreview
          bodyBytes={bodyBytes}
          message="Image is too large to preview inline. Download it instead."
        />
      );
    }
    return (
      <div className="max-h-[360px] overflow-auto rounded-xl border border-border-subtle bg-surface p-3">
        <img src={imageDataUrl} alt="Yaku body preview" className="max-h-[320px] max-w-full rounded-lg object-contain" />
      </div>
    );
  }

  if (viewerKind === "binary") {
    return <BinaryPreview bodyBytes={bodyBytes} />;
  }

  if (body.byteLength > LARGE_TEXT_BODY_BYTES) {
    return (
      <BinaryPreview
        bodyBytes={bodyBytes}
        message="Text body is too large to render inline. Showing a hex preview instead."
      />
    );
  }

  return (
    <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border-subtle bg-surface p-3 text-xs text-text-subtle">
      {renderedText || "Body is empty."}
    </pre>
  );
}

function BinaryPreview({
  bodyBytes,
  message = "Binary body preview",
}: {
  bodyBytes: Uint8Array;
  message?: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="text-xs uppercase tracking-[0.18em] text-text-subtlest">{message}</div>
      <pre className="mt-3 max-h-[220px] overflow-auto whitespace-pre-wrap break-words text-xs text-text-subtle">
        {hexPreview(bodyBytes)}
      </pre>
    </div>
  );
}

function BodyMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface px-3 py-2">
      <div className="text-xs uppercase tracking-[0.18em] text-text-subtlest">{label}</div>
      <div className="mt-1 truncate text-sm text-text">{value}</div>
    </div>
  );
}

type BodyViewerKind = "json" | "text" | "html" | "image" | "binary";

function inferBodyViewerKind(body: YakuRunBody | null, bodyText: string): BodyViewerKind {
  if (body == null) return "text";
  const contentType = body.contentType?.toLowerCase() ?? "";
  const mime = contentType.split(";")[0]?.trim() ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("json") || looksLikeJson(bodyText)) return "json";
  if (mime.includes("html")) return "html";
  if (isProbablyTextContentType(body.contentType) || looksLikeText(bodyText)) return "text";
  return "binary";
}

function looksLikeJson(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function looksLikeText(value: string) {
  if (value === "") return true;
  const sample = value.slice(0, 512);
  return !sample.includes("\uFFFD") && !/[\u0000-\u0008\u000E-\u001F]/.test(sample);
}

function hexPreview(bytes: Uint8Array) {
  const preview = Array.from(bytes.slice(0, 512))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join(" ");
  return bytes.length > 512 ? `${preview}\n... ${bytes.length - 512} more bytes` : preview;
}

function bytesToDataUrl(bytes: Uint8Array, contentType: string) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return `data:${contentType};base64,${globalThis.btoa(binary)}`;
}

function downloadBody(body: YakuRunBody, bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: body.contentType ?? "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `yaku-body-${body.bodyRole}-${body.id}${extensionForContentType(body.contentType)}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function extensionForContentType(contentType: string | null) {
  const mime = contentType?.split(";")[0]?.trim().toLowerCase();
  if (mime == null || mime === "") return ".bin";
  if (mime.includes("json")) return ".json";
  if (mime.includes("html")) return ".html";
  if (mime.includes("xml")) return ".xml";
  if (mime.startsWith("text/")) return ".txt";
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/gif") return ".gif";
  if (mime === "image/webp") return ".webp";
  return ".bin";
}
