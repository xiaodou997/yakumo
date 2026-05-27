import { Button } from "../../components/core/Button";
import { HStack, VStack } from "../../components/core/Stacks";
import { fieldClassName, textareaClassName } from "./RequestFieldPrimitives";
import { FieldLabel } from "./WorkspacePanels";

export function WorkspaceContextEnvironmentEditorCard({
  selectedWorkspaceId,
  selectedEnvironmentId,
  environmentName,
  setEnvironmentName,
  environmentVariablesText,
  setEnvironmentVariablesText,
  isCreatingEnvironment,
  isUpdatingEnvironment,
  isDeletingEnvironment,
  onCreateEnvironment,
  onUpdateEnvironment,
  onDeleteEnvironment,
}: {
  selectedWorkspaceId: string | null | undefined;
  selectedEnvironmentId: string | null | undefined;
  environmentName: string;
  setEnvironmentName: (value: string) => void;
  environmentVariablesText: string;
  setEnvironmentVariablesText: (value: string) => void;
  isCreatingEnvironment: boolean;
  isUpdatingEnvironment: boolean;
  isDeletingEnvironment: boolean;
  onCreateEnvironment: () => void;
  onUpdateEnvironment: () => void;
  onDeleteEnvironment: () => void;
}) {
  return (
    <form
      className="rounded-xl border border-border-subtle bg-surface p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onUpdateEnvironment();
      }}
    >
      <VStack space={2}>
        <FieldLabel htmlFor="yaku-environment-name">Environment Editor</FieldLabel>
        <input
          id="yaku-environment-name"
          value={environmentName}
          onChange={(event) => setEnvironmentName(event.target.value)}
          className={fieldClassName}
        />
        <textarea
          value={environmentVariablesText}
          onChange={(event) => setEnvironmentVariablesText(event.target.value)}
          rows={5}
          className={textareaClassName}
        />
        <HStack space={2} wrap>
          <Button
            size="xs"
            type="button"
            disabled={selectedWorkspaceId == null}
            isLoading={isCreatingEnvironment}
            onClick={onCreateEnvironment}
          >
            Create Env
          </Button>
          <Button
            size="xs"
            type="submit"
            variant="border"
            disabled={selectedEnvironmentId == null}
            isLoading={isUpdatingEnvironment}
          >
            Save Env
          </Button>
          <Button
            size="xs"
            type="button"
            variant="border"
            color="danger"
            disabled={selectedEnvironmentId == null}
            isLoading={isDeletingEnvironment}
            onClick={onDeleteEnvironment}
          >
            Delete Env
          </Button>
        </HStack>
      </VStack>
    </form>
  );
}
