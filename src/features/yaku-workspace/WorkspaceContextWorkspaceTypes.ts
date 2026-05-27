import type { YakuEnvironment, YakuWorkspace } from "../../lib/yaku-client";

export type WorkspaceContextWorkspaceSectionProps = {
  workspaces: YakuWorkspace[];
  environments: YakuEnvironment[];
  selectedWorkspaceId: string | null | undefined;
  selectedEnvironmentId: string | null | undefined;
  selectedEnvironmentVariables: Record<string, unknown>;
  workspaceName: string;
  setWorkspaceName: (value: string) => void;
  environmentName: string;
  setEnvironmentName: (value: string) => void;
  environmentVariablesText: string;
  setEnvironmentVariablesText: (value: string) => void;
  isCreatingWorkspace: boolean;
  isCreatingEnvironment: boolean;
  isUpdatingEnvironment: boolean;
  isDeletingEnvironment: boolean;
  onCreateWorkspace: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onSelectEnvironment: (environmentId: string | undefined) => void;
  onCreateEnvironment: () => void;
  onUpdateEnvironment: () => void;
  onDeleteEnvironment: () => void;
};

export function selectWorkspaceContextOptions<T extends { id: string }>(
  items: T[],
  label: (item: T) => string,
) {
  return items.map((item) => ({ label: label(item), value: item.id }));
}
