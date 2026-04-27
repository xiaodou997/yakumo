import type { HttpResponse } from "@yakumo-internal/models";
import { lazy, Suspense } from "react";
import { useHttpRequestBody } from "../hooks/useHttpRequestBody";
import { getMimeTypeFromContentType, languageFromContentType } from "../lib/contentType";
import { LoadingIcon } from "./core/LoadingIcon";
import { EmptyStateText } from "./EmptyStateText";

const AudioViewer = lazy(() =>
  import("./responseViewers/AudioViewer").then((m) => ({ default: m.AudioViewer })),
);

const CsvViewer = lazy(() =>
  import("./responseViewers/CsvViewer").then((m) => ({ default: m.CsvViewer })),
);

const ImageViewer = lazy(() =>
  import("./responseViewers/ImageViewer").then((m) => ({ default: m.ImageViewer })),
);

const MultipartViewer = lazy(() =>
  import("./responseViewers/MultipartViewer").then((m) => ({
    default: m.MultipartViewer,
  })),
);

const PdfViewer = lazy(() =>
  import("./responseViewers/PdfViewer").then((m) => ({ default: m.PdfViewer })),
);

const SvgViewer = lazy(() =>
  import("./responseViewers/SvgViewer").then((m) => ({ default: m.SvgViewer })),
);

const TextViewer = lazy(() =>
  import("./responseViewers/TextViewer").then((m) => ({ default: m.TextViewer })),
);

const VideoViewer = lazy(() =>
  import("./responseViewers/VideoViewer").then((m) => ({ default: m.VideoViewer })),
);

const WebPageViewer = lazy(() =>
  import("./responseViewers/WebPageViewer").then((m) => ({ default: m.WebPageViewer })),
);

interface Props {
  response: HttpResponse;
}

export function RequestBodyViewer({ response }: Props) {
  return (
    <Suspense fallback={<LoadingIcon />}>
      <RequestBodyViewerInner key={response.id} response={response} />
    </Suspense>
  );
}

function RequestBodyViewerInner({ response }: Props) {
  const { data, isLoading, error } = useHttpRequestBody(response);

  if (isLoading) {
    return (
      <EmptyStateText>
        <LoadingIcon />
      </EmptyStateText>
    );
  }

  if (error) {
    return <EmptyStateText>Error loading request body: {error.message}</EmptyStateText>;
  }

  if (data?.bodyText == null || data.bodyText.length === 0) {
    return <EmptyStateText>No request body</EmptyStateText>;
  }

  const { bodyText, body } = data;

  // Try to detect language from content-type header that was sent
  const contentTypeHeader = response.requestHeaders.find(
    (h) => h.name.toLowerCase() === "content-type",
  );
  const contentType = contentTypeHeader?.value ?? null;
  const mimeType = contentType ? getMimeTypeFromContentType(contentType).essence : null;
  const language = languageFromContentType(contentType, bodyText);

  // Route to appropriate viewer based on content type
  if (mimeType?.match(/^multipart/i)) {
    const boundary = contentType?.split("boundary=")[1] ?? "unknown";
    // Create a copy because parseMultipart may detach the buffer
    const bodyCopy = new Uint8Array(body);
    return (
      <MultipartViewer data={bodyCopy} boundary={boundary} idPrefix={`request.${response.id}`} />
    );
  }

  if (mimeType?.match(/^image\/svg/i)) {
    return <SvgViewer text={bodyText} />;
  }

  if (mimeType?.match(/^image/i)) {
    return <ImageViewer data={body.buffer} />;
  }

  if (mimeType?.match(/^audio/i)) {
    return <AudioViewer data={body} />;
  }

  if (mimeType?.match(/^video/i)) {
    return <VideoViewer data={body} />;
  }

  if (mimeType?.match(/csv|tab-separated/i)) {
    return <CsvViewer text={bodyText} />;
  }

  if (mimeType?.match(/^text\/html/i)) {
    return <WebPageViewer html={bodyText} />;
  }

  if (mimeType?.match(/pdf/i)) {
    return <PdfViewer data={body} />;
  }

  return (
    <TextViewer text={bodyText} language={language} stateKey={`request.body.${response.id}`} />
  );
}
