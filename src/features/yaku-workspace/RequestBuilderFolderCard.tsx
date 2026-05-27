import { Button } from "../../components/core/Button";
import { VStack } from "../../components/core/Stacks";
import { fieldClassName } from "./RequestFieldPrimitives";
import { FieldLabel } from "./WorkspacePanels";

export function RequestBuilderFolderCard({
  workspaceId,
  folderName,
  setFolderName,
  isCreatingFolder,
  onCreateFolder,
}: {
  workspaceId: string | null | undefined;
  folderName: string;
  setFolderName: (value: string) => void;
  isCreatingFolder: boolean;
  onCreateFolder: () => void;
}) {
  return (
    <form
      className="rounded-xl border border-border-subtle bg-surface p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onCreateFolder();
      }}
    >
      <VStack space={2}>
        <FieldLabel htmlFor="yaku-folder-name">New Folder</FieldLabel>
        <input
          id="yaku-folder-name"
          value={folderName}
          onChange={(event) => setFolderName(event.target.value)}
          className={fieldClassName}
        />
        <Button
          size="xs"
          type="submit"
          disabled={workspaceId == null}
          isLoading={isCreatingFolder}
        >
          Create Folder
        </Button>
      </VStack>
    </form>
  );
}
