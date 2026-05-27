import { Select } from "../../components/core/Select";
import type { YakuEnvironment, YakuWorkspace } from "../../lib/yaku-client";
import { selectWorkspaceContextOptions } from "./WorkspaceContextWorkspaceTypes";

export function WorkspaceContextWorkspaceSelectors({
  workspaces,
  environments,
  selectedWorkspaceId,
  selectedEnvironmentId,
  onSelectWorkspace,
  onSelectEnvironment,
}: {
  workspaces: YakuWorkspace[];
  environments: YakuEnvironment[];
  selectedWorkspaceId: string | null | undefined;
  selectedEnvironmentId: string | null | undefined;
  onSelectWorkspace: (workspaceId: string) => void;
  onSelectEnvironment: (environmentId: string | undefined) => void;
}) {
  return (
    <>
      <Select
        name="yaku-workspace"
        label="Workspace"
        value={selectedWorkspaceId ?? ""}
        options={selectWorkspaceContextOptions(workspaces, (workspace) => workspace.name)}
        onChange={onSelectWorkspace}
      />
      <Select
        name="yaku-environment"
        label="Environment Override"
        value={selectedEnvironmentId ?? "__none__"}
        options={[
          { label: "No Override", value: "__none__" },
          ...selectWorkspaceContextOptions(environments, (environment) => environment.name),
        ]}
        onChange={(value) => onSelectEnvironment(value === "__none__" ? undefined : value)}
      />
    </>
  );
}
