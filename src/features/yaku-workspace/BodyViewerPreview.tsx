import { EmptyCopy } from "./WorkspacePanels";
import {
  hexPreview,
  LARGE_TEXT_BODY_BYTES,
} from "./BodyViewerModel";
import type { BodyPreviewProps } from "./BodyViewerTypes";

export function BodyPreview({
  body,
  bodyBytes,
  imageDataUrl,
  renderedText,
  viewerKind,
}: BodyPreviewProps) {
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
        <img
          src={imageDataUrl}
          alt="Yaku body preview"
          className="max-h-[320px] max-w-full rounded-lg object-contain"
        />
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
