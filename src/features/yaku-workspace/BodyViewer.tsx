import { useDeferredValue, useMemo, useState } from "react";
import { FormattedError } from "../../components/core/FormattedError";
import { Select } from "../../components/core/Select";
import { VStack } from "../../components/core/Stacks";
import type { YakuRunBody } from "../../lib/yaku-client";
import { EmptyCopy } from "./WorkspacePanels";
import { BodyMeta } from "./BodyViewerMeta";
import { BodyPreview } from "./BodyViewerPreview";
import { BodyViewerActions } from "./BodyViewerActions";
import {
  bodyBytesToText,
  bytesToDataUrl,
  downloadBody,
  inferBodyViewerKind,
  previewLanguageForBody,
  renderBodyText,
} from "./BodyViewerModel";
import type { BodyViewerProps } from "./BodyViewerTypes";

export function YakuBodyViewer({
  bodies,
  selectedBodyId,
  setSelectedBodyId,
  bodyBytes,
  isLoading,
  error,
}: BodyViewerProps) {
  const [textMode, setTextMode] = useState<"pretty" | "raw">("pretty");
  const selectedBody = bodies.find((body) => body.id === selectedBodyId) ?? null;
  const bodyByteArray = useMemo(
    () => (bodyBytes == null ? null : Uint8Array.from(bodyBytes)),
    [bodyBytes],
  );
  const bodyText = useMemo(() => bodyBytesToText(bodyBytes), [bodyBytes]);
  const deferredBodyText = useDeferredValue(bodyText);
  const viewerKind = useMemo(
    () => inferBodyViewerKind(selectedBody, deferredBodyText),
    [deferredBodyText, selectedBody],
  );
  const renderedText = useMemo(
    () => renderBodyText(deferredBodyText, textMode, viewerKind),
    [deferredBodyText, textMode, viewerKind],
  );
  const previewLanguage = useMemo(
    () => previewLanguageForBody(selectedBody, renderedText),
    [renderedText, selectedBody],
  );
  const imageDataUrl = useMemo(() => {
    if (selectedBody == null || bodyByteArray == null || viewerKind !== "image") return null;
    return bytesToDataUrl(
      bodyByteArray,
      selectedBody.contentType ?? "application/octet-stream",
    );
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
          <BodyViewerActions
            viewerKind={viewerKind}
            textMode={textMode}
            setTextMode={setTextMode}
            canDownload={bodyByteArray != null}
            onDownload={() => {
              if (bodyByteArray != null) {
                downloadBody(selectedBody, bodyByteArray);
              }
            }}
          />
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
