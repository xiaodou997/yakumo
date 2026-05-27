import { WorkspaceContextEnvironmentEditorCard } from "./WorkspaceContextEnvironmentEditorCard";
import { WorkspaceContextEnvironmentPreview } from "./WorkspaceContextEnvironmentPreview";
import { WorkspaceContextWorkspaceCreateCard } from "./WorkspaceContextWorkspaceCreateCard";
import { WorkspaceContextWorkspaceSelectors } from "./WorkspaceContextWorkspaceSelectors";
import type { WorkspaceContextWorkspaceSectionProps } from "./WorkspaceContextWorkspaceTypes";

export function WorkspaceContextWorkspaceSection({
  workspaces,
  environments,
  selectedWorkspaceId,
  selectedEnvironmentId,
  selectedEnvironmentVariables,
  workspaceName,
  setWorkspaceName,
  environmentName,
  setEnvironmentName,
  environmentVariablesText,
  setEnvironmentVariablesText,
  isCreatingWorkspace,
  isCreatingEnvironment,
  isUpdatingEnvironment,
  isDeletingEnvironment,
  onCreateWorkspace,
  onSelectWorkspace,
  onSelectEnvironment,
  onCreateEnvironment,
  onUpdateEnvironment,
  onDeleteEnvironment,
}: WorkspaceContextWorkspaceSectionProps) {
  return (
    <>
      <WorkspaceContextWorkspaceCreateCard
        workspaceName={workspaceName}
        setWorkspaceName={setWorkspaceName}
        isCreatingWorkspace={isCreatingWorkspace}
        onCreateWorkspace={onCreateWorkspace}
      />
      <WorkspaceContextWorkspaceSelectors
        workspaces={workspaces}
        environments={environments}
        selectedWorkspaceId={selectedWorkspaceId}
        selectedEnvironmentId={selectedEnvironmentId}
        onSelectWorkspace={onSelectWorkspace}
        onSelectEnvironment={onSelectEnvironment}
      />
      <WorkspaceContextEnvironmentEditorCard
        selectedWorkspaceId={selectedWorkspaceId}
        selectedEnvironmentId={selectedEnvironmentId}
        environmentName={environmentName}
        setEnvironmentName={setEnvironmentName}
        environmentVariablesText={environmentVariablesText}
        setEnvironmentVariablesText={setEnvironmentVariablesText}
        isCreatingEnvironment={isCreatingEnvironment}
        isUpdatingEnvironment={isUpdatingEnvironment}
        isDeletingEnvironment={isDeletingEnvironment}
        onCreateEnvironment={onCreateEnvironment}
        onUpdateEnvironment={onUpdateEnvironment}
        onDeleteEnvironment={onDeleteEnvironment}
      />
      <WorkspaceContextEnvironmentPreview
        selectedEnvironmentVariables={selectedEnvironmentVariables}
      />
    </>
  );
}
