import { textareaClassName } from "./RequestFieldPrimitives";
import type {
  RequestGrpcMessageSectionProps,
} from "./RequestGrpcTypes";
import { RequestGrpcMessageStatus } from "./RequestGrpcMessageStatus";
import { RequestGrpcMessageToolbar } from "./RequestGrpcMessageToolbar";

export function RequestGrpcMessageSection({
  grpcMessage,
  setGrpcMessage,
  grpcMessageValidation,
  selectedMethodTemplate,
  selectedMethodShape,
  selectedMethodMissingRequiredFieldsCount,
  selectedMissingRequiredFieldsCount,
  recentChangedContainerPaths,
  lastInsertedFieldPath,
  lastFillSummary,
  messageEditorNotice,
  onFormatMessage,
  onFillMissing,
  onFillMissingRequired,
  onFillSelectedRequired,
  onReviewRequired,
  onReviewChanges,
  onReviewChangedContainers,
  onLocateInsertedField,
  onClearInsertedField,
  onLocateFillSummaryPath,
  onFocusChangedContainer,
}: RequestGrpcMessageSectionProps) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">
            Request Message
          </div>
          <div className="mt-1 text-[11px] text-text-subtle">
            Yaku sends gRPC request payloads as structured JSON objects.
          </div>
        </div>
        <RequestGrpcMessageToolbar
          grpcMessage={grpcMessage}
          selectedMethodTemplate={selectedMethodTemplate}
          selectedMethodShape={selectedMethodShape}
          selectedMethodMissingRequiredFieldsCount={selectedMethodMissingRequiredFieldsCount}
          selectedMissingRequiredFieldsCount={selectedMissingRequiredFieldsCount}
          recentChangedContainerPaths={recentChangedContainerPaths}
          lastFillSummary={lastFillSummary}
          onFormatMessage={onFormatMessage}
          onFillMissing={onFillMissing}
          onFillMissingRequired={onFillMissingRequired}
          onFillSelectedRequired={onFillSelectedRequired}
          onReviewRequired={onReviewRequired}
          onReviewChanges={onReviewChanges}
          onReviewChangedContainers={onReviewChangedContainers}
        />
      </div>
      <textarea
        value={grpcMessage}
        onChange={(event) => setGrpcMessage(event.target.value)}
        rows={8}
        placeholder='{"ping":"pong"}'
        className={`${textareaClassName} mt-3`}
      />
      <RequestGrpcMessageStatus
        grpcMessageValidation={grpcMessageValidation}
        lastInsertedFieldPath={lastInsertedFieldPath}
        lastFillSummary={lastFillSummary}
        recentChangedContainerPaths={recentChangedContainerPaths}
        messageEditorNotice={messageEditorNotice}
        onLocateInsertedField={onLocateInsertedField}
        onClearInsertedField={onClearInsertedField}
        onLocateFillSummaryPath={onLocateFillSummaryPath}
        onFocusChangedContainer={onFocusChangedContainer}
        onReviewChangedContainers={onReviewChangedContainers}
      />
    </div>
  );
}
