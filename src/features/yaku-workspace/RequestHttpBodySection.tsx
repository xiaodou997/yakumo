import { fieldClassName, textareaClassName } from "./RequestFieldPrimitives";
import type { RequestHttpBodySectionProps } from "./RequestHttpGraphqlTypes";
import { RequestHttpBodyInfo } from "./RequestHttpBodyInfo";
import { RequestHttpBodyModeSection } from "./RequestHttpBodyModeSection";
import { RequestMultipartPartsEditor } from "./RequestMultipartPartsEditor";

export function RequestHttpBodySection({
  protocol,
  bodyMode,
  setBodyMode,
  body,
  setBody,
  bodyFilePath,
  setBodyFilePath,
  multipartParts,
  setMultipartParts,
}: RequestHttpBodySectionProps) {
  const mode =
    bodyMode === "file" || bodyMode === "json" || bodyMode === "multipart"
      ? bodyMode
      : "text";

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">
          Body
        </div>
        <RequestHttpBodyModeSection mode={mode} setMode={setBodyMode} />
      </div>
      {mode === "file" ? (
        <input
          value={bodyFilePath}
          onChange={(event) => setBodyFilePath(event.target.value)}
          placeholder="/absolute/path/to/body.bin"
          className={`${fieldClassName} mt-3`}
        />
      ) : mode === "multipart" ? (
        <RequestMultipartPartsEditor parts={multipartParts} setParts={setMultipartParts} />
      ) : (
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          placeholder={
            protocol === "graphql"
              ? '{"query":"{ __typename }"}'
              : "Request body"
          }
          className={`${textareaClassName} mt-3`}
        />
      )}
      <RequestHttpBodyInfo mode={mode} />
    </div>
  );
}
