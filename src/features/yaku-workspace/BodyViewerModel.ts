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
import type { BodyViewerKind } from "./BodyViewerTypes";

export const LARGE_TEXT_BODY_BYTES = 1024 * 1024;
export const LARGE_IMAGE_BODY_BYTES = 5 * 1024 * 1024;

export function bodyBytesToText(bodyBytes: number[] | undefined) {
  if (bodyBytes == null) return "";
  return decodeYakuBody(bodyBytes);
}

export function inferBodyViewerKind(
  body: YakuRunBody | null,
  bodyText: string,
): BodyViewerKind {
  if (body == null) return "text";
  const contentType = body.contentType?.toLowerCase() ?? "";
  const mime = contentType.split(";")[0]?.trim() ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("json") || looksLikeJson(bodyText)) return "json";
  if (mime.includes("html")) return "html";
  if (isProbablyTextContentType(body.contentType) || looksLikeText(bodyText)) {
    return "text";
  }
  return "binary";
}

export function renderBodyText(
  bodyText: string,
  textMode: "pretty" | "raw",
  viewerKind: BodyViewerKind,
) {
  if (textMode === "pretty" && viewerKind === "json") {
    return formatJsonIfPossible(bodyText);
  }
  return bodyText;
}

export function previewLanguageForBody(
  body: YakuRunBody | null,
  renderedText: string,
) {
  return body?.contentType == null
    ? languageFromContent(renderedText, "text")
    : languageFromContentType(body.contentType, renderedText);
}

export function bytesToDataUrl(bytes: Uint8Array, contentType: string) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return `data:${contentType};base64,${globalThis.btoa(binary)}`;
}

export function hexPreview(bytes: Uint8Array) {
  const preview = Array.from(bytes.slice(0, 512))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join(" ");
  return bytes.length > 512 ? `${preview}\n... ${bytes.length - 512} more bytes` : preview;
}

export function downloadBody(body: YakuRunBody, bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], {
    type: body.contentType ?? "application/octet-stream",
  });
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

function looksLikeJson(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function looksLikeText(value: string) {
  if (value === "") return true;
  const sample = value.slice(0, 512);
  return !sample.includes("\uFFFD") && !/[\u0000-\u0008\u000E-\u001F]/.test(sample);
}
