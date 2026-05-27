import { Button } from "../../components/core/Button";
import { VStack } from "../../components/core/Stacks";
import { fieldClassName } from "./RequestFieldPrimitives";
import { FieldLabel } from "./WorkspacePanels";

export function WorkspaceContextWorkspaceCreateCard({
  workspaceName,
  setWorkspaceName,
  isCreatingWorkspace,
  onCreateWorkspace,
}: {
  workspaceName: string;
  setWorkspaceName: (value: string) => void;
  isCreatingWorkspace: boolean;
  onCreateWorkspace: () => void;
}) {
  return (
    <form
      className="rounded-xl border border-border-subtle bg-surface p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onCreateWorkspace();
      }}
    >
      <VStack space={2}>
        <FieldLabel htmlFor="yaku-workspace-name">Create Workspace</FieldLabel>
        <input
          id="yaku-workspace-name"
          value={workspaceName}
          onChange={(event) => setWorkspaceName(event.target.value)}
          className={fieldClassName}
        />
        <Button size="xs" type="submit" isLoading={isCreatingWorkspace}>
          Create Workspace
        </Button>
      </VStack>
    </form>
  );
}
