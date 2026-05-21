import type { ReactNode } from "react";
import { Button } from "../../components/core/Button";
import { HStack, VStack } from "../../components/core/Stacks";
import type { YakuRequestNodePageItem } from "../../lib/yaku-client";
import { fieldClassName } from "./RequestFieldPrimitives";
import { EmptyCopy, FieldLabel, WorkspacePanel } from "./WorkspacePanels";

export function FolderSnapshotPanel({
  folderNode,
  editName,
  setEditName,
  moveControls,
  isSaving,
  isDeleting,
  onSave,
  onUseAsParent,
  onDelete,
}: {
  folderNode: YakuRequestNodePageItem | null | undefined;
  editName: string;
  setEditName: (value: string) => void;
  moveControls: ReactNode;
  isSaving: boolean;
  isDeleting: boolean;
  onSave: () => void;
  onUseAsParent: () => void;
  onDelete: () => void;
}) {
  return (
    <WorkspacePanel title="Folder Snapshot" subtitle="Selected folder and node actions.">
      {folderNode == null ? (
        <EmptyCopy>Select a folder to manage it.</EmptyCopy>
      ) : (
        <VStack space={3}>
          <HStack justifyContent="between" alignItems="start" className="gap-3">
            <VStack space={1}>
              <div className="text-lg font-semibold text-text">{folderNode.name}</div>
              <div className="text-xs uppercase tracking-[0.22em] text-text-subtlest">Folder</div>
            </VStack>
            <div className="rounded-full border border-border-subtle px-2 py-1 text-xs text-text-subtle">
              {folderNode.id}
            </div>
          </HStack>
          <form
            className="rounded-xl border border-border-subtle bg-surface p-3"
            onSubmit={(event) => {
              event.preventDefault();
              onSave();
            }}
          >
            <VStack space={2}>
              <FieldLabel htmlFor="yaku-folder-edit-name">Folder Name</FieldLabel>
              <input
                id="yaku-folder-edit-name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className={fieldClassName}
              />
              <Button size="xs" type="submit" isLoading={isSaving}>
                Save Folder
              </Button>
            </VStack>
          </form>
          {moveControls}
          <HStack space={2} wrap>
            <Button size="xs" variant="border" onClick={onUseAsParent}>
              Use As Parent
            </Button>
            <Button size="xs" variant="border" color="danger" isLoading={isDeleting} onClick={onDelete}>
              Delete Folder
            </Button>
          </HStack>
        </VStack>
      )}
    </WorkspacePanel>
  );
}
