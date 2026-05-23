import type { ReactNode } from "react";
import { Button } from "../../components/core/Button";
import { FormattedError } from "../../components/core/FormattedError";
import { HStack, VStack } from "../../components/core/Stacks";
import type { YakuCookieJar, YakuProtocol, YakuRequest } from "../../lib/yaku-client";
import { fieldClassName, textareaClassName } from "./RequestFieldPrimitives";
import { RequestConfigSummary, RequestStructuredEditor } from "./RequestEditor";
import type { RequestEditDraft } from "./useYakuWorkspaceForms";
import { EmptyCopy, WorkspacePanel } from "./WorkspacePanels";

export function RequestSnapshotPanel({
  request,
  error,
  draft,
  cookieJars,
  moveControls,
  isSaving,
  isDeleting,
  canDelete,
  onSaveStructured,
  onSaveRaw,
  onDelete,
}: {
  request: YakuRequest | null | undefined;
  error: unknown;
  draft: RequestEditDraft;
  cookieJars: YakuCookieJar[];
  moveControls: ReactNode;
  isSaving: boolean;
  isDeleting: boolean;
  canDelete: boolean;
  onSaveStructured: () => void;
  onSaveRaw: () => void;
  onDelete: () => void;
}) {
  return (
    <WorkspacePanel title="Request Snapshot" subtitle="Resolved from the Yaku request record before execution.">
      {error ? (
        <FormattedError>{String(error)}</FormattedError>
      ) : request == null ? (
        <EmptyCopy>Select a request to inspect its config.</EmptyCopy>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSaveStructured();
          }}
        >
          <VStack space={3}>
            <HStack justifyContent="between" alignItems="start" className="gap-3">
              <VStack space={1}>
                <div className="text-lg font-semibold text-text">{request.name}</div>
                <div className="text-xs uppercase tracking-[0.22em] text-text-subtlest">
                  {request.protocol}
                </div>
              </VStack>
              <div className="rounded-full border border-border-subtle px-2 py-1 text-xs text-text-subtle">
                {request.id}
              </div>
            </HStack>
            <RequestConfigSummary protocol={request.protocol} config={request.config} />
            <input
              value={draft.name}
              onChange={(event) => draft.setName(event.target.value)}
              className={fieldClassName}
            />
            <input
              value={draft.description}
              onChange={(event) => draft.setDescription(event.target.value)}
              placeholder="Description"
              className={fieldClassName}
            />
            <RequestStructuredEditor
              protocol={request.protocol as YakuProtocol}
              draft={draft.config}
              cookieJars={cookieJars}
            />
            {moveControls}
            <div className="rounded-xl border border-border-subtle bg-surface p-3">
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-text-subtlest">
                Raw JSON Override
              </div>
              <textarea
                value={draft.configText}
                onChange={(event) => draft.setConfigText(event.target.value)}
                rows={8}
                className={textareaClassName}
              />
              <div className="mt-2 text-xs leading-5 text-text-subtle">
                Use this only for fields not represented above. Saving with the primary button uses
                the structured editor.
              </div>
            </div>
            <HStack space={2} wrap>
              <Button size="xs" type="submit" isLoading={isSaving}>
                Save Request
              </Button>
              <Button
                size="xs"
                type="button"
                variant="border"
                isLoading={isSaving}
                onClick={onSaveRaw}
              >
                Apply Raw JSON
              </Button>
              <Button
                size="xs"
                type="button"
                variant="border"
                color="danger"
                disabled={!canDelete}
                isLoading={isDeleting}
                onClick={onDelete}
              >
                Delete Request
              </Button>
            </HStack>
          </VStack>
        </form>
      )}
    </WorkspacePanel>
  );
}
