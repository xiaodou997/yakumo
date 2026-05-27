import { textareaClassName } from "./RequestFieldPrimitives";
import type { RequestGrpcSelectedMethodSchemaPreviewProps } from "./RequestGrpcTypes";

export function RequestGrpcSchemaPreviewSection({
  schemaPreview,
}: {
  schemaPreview: RequestGrpcSelectedMethodSchemaPreviewProps;
}) {
  const { selectedMethodTemplateText, schemaText } = schemaPreview;

  return (
    <>
      <textarea
        readOnly
        rows={8}
        value={schemaText}
        className={`${textareaClassName} mt-3 min-h-52 bg-surface`}
      />
      <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-text-subtlest">
        Message Template
      </div>
      <textarea
        readOnly
        rows={6}
        value={selectedMethodTemplateText}
        className={`${textareaClassName} mt-2 bg-surface`}
      />
    </>
  );
}
