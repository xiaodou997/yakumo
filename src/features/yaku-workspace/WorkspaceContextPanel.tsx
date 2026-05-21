import { Button } from "../../components/core/Button";
import { Select } from "../../components/core/Select";
import { HStack, VStack } from "../../components/core/Stacks";
import type {
  YakuBackupImportResponse,
  YakuBackupManifest,
  YakuEnvironment,
  YakuGcReport,
  YakuWorkspace,
} from "../../lib/yaku-client";
import { fieldClassName, textareaClassName } from "./RequestFieldPrimitives";
import { FieldLabel, WorkspacePanel } from "./WorkspacePanels";

export function WorkspaceContextPanel({
  workspaces,
  environments,
  selectedWorkspaceId,
  selectedEnvironmentId,
  workspaceName,
  setWorkspaceName,
  environmentName,
  setEnvironmentName,
  environmentVariablesText,
  setEnvironmentVariablesText,
  retention,
  gcReport,
  exportResult,
  importResult,
  isCreatingWorkspace,
  isCreatingEnvironment,
  isUpdatingEnvironment,
  isDeletingEnvironment,
  isSettingRetention,
  isClearingRetention,
  isGcBodies,
  isExportingBackup,
  isImportingBackup,
  onCreateWorkspace,
  onSelectWorkspace,
  onSelectEnvironment,
  onCreateEnvironment,
  onUpdateEnvironment,
  onDeleteEnvironment,
  onSetRetention,
  onClearRetention,
  onGcBodies,
  onExportBackup,
  onImportBackup,
}: {
  workspaces: YakuWorkspace[];
  environments: YakuEnvironment[];
  selectedWorkspaceId: string | null | undefined;
  selectedEnvironmentId: string | null | undefined;
  workspaceName: string;
  setWorkspaceName: (value: string) => void;
  environmentName: string;
  setEnvironmentName: (value: string) => void;
  environmentVariablesText: string;
  setEnvironmentVariablesText: (value: string) => void;
  retention: number | null | undefined;
  gcReport?: YakuGcReport;
  exportResult?: YakuBackupManifest;
  importResult?: YakuBackupImportResponse;
  isCreatingWorkspace: boolean;
  isCreatingEnvironment: boolean;
  isUpdatingEnvironment: boolean;
  isDeletingEnvironment: boolean;
  isSettingRetention: boolean;
  isClearingRetention: boolean;
  isGcBodies: boolean;
  isExportingBackup: boolean;
  isImportingBackup: boolean;
  onCreateWorkspace: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onSelectEnvironment: (environmentId: string | undefined) => void;
  onCreateEnvironment: () => void;
  onUpdateEnvironment: () => void;
  onDeleteEnvironment: () => void;
  onSetRetention: (limit: number) => void;
  onClearRetention: () => void;
  onGcBodies: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
}) {
  const selectedEnvironment = environments.find((environment) => environment.id === selectedEnvironmentId);

  return (
    <WorkspacePanel title="Workspace Context" subtitle="Choose the Yaku workspace and environment.">
      <VStack space={3}>
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
        <Select
          name="yaku-workspace"
          label="Workspace"
          value={selectedWorkspaceId ?? ""}
          options={selectOptions(workspaces, (workspace) => workspace.name)}
          onChange={onSelectWorkspace}
        />
        <Select
          name="yaku-environment"
          label="Environment Override"
          value={selectedEnvironmentId ?? "__none__"}
          options={[
            { label: "No Override", value: "__none__" },
            ...selectOptions(environments, (environment) => environment.name),
          ]}
          onChange={(value) => onSelectEnvironment(value === "__none__" ? undefined : value)}
        />
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
        <div className="rounded-xl border border-border-subtle bg-surface p-3">
          <div className="mb-1 text-xs uppercase tracking-[0.2em] text-text-subtlest">
            Environment Variables
          </div>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs text-text-subtle">
            {JSON.stringify(selectedEnvironment?.variables ?? {}, null, 2)}
          </pre>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface p-3">
          <HStack justifyContent="between" alignItems="start" className="gap-3">
            <VStack space={1}>
              <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">
                Run Retention
              </div>
              <div className="text-sm text-text">
                {retention == null ? "Unlimited" : `${retention.toLocaleString()} runs`}
              </div>
            </VStack>
            <Button size="xs" variant="border" isLoading={isGcBodies} onClick={onGcBodies}>
              GC Bodies
            </Button>
          </HStack>
          <HStack space={2} wrap className="mt-3">
            <Button
              size="xs"
              variant="border"
              disabled={selectedWorkspaceId == null}
              isLoading={isSettingRetention}
              onClick={() => onSetRetention(25)}
            >
              Keep 25
            </Button>
            <Button
              size="xs"
              variant="border"
              disabled={selectedWorkspaceId == null}
              isLoading={isSettingRetention}
              onClick={() => onSetRetention(100)}
            >
              Keep 100
            </Button>
            <Button
              size="xs"
              variant="border"
              disabled={selectedWorkspaceId == null}
              isLoading={isClearingRetention}
              onClick={onClearRetention}
            >
              Clear
            </Button>
          </HStack>
          {gcReport != null ? (
            <div className="mt-3 text-xs text-text-subtle">
              Deleted {gcReport.deleted} files · Retained {gcReport.retained}
            </div>
          ) : null}
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface p-3">
          <VStack space={2}>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">Backup</div>
              <div className="mt-1 text-xs leading-5 text-text-subtle">
                Yaku native JSON only. Import replaces an existing workspace with the same id.
              </div>
            </div>
            <HStack space={2} wrap>
              <Button
                size="xs"
                variant="border"
                disabled={selectedWorkspaceId == null}
                isLoading={isExportingBackup}
                onClick={onExportBackup}
              >
                Export Workspace
              </Button>
              <Button size="xs" variant="border" isLoading={isImportingBackup} onClick={onImportBackup}>
                Import Backup
              </Button>
            </HStack>
            {exportResult != null ? (
              <div className="text-xs text-text-subtle">
                Exported hash {exportResult.contentHash.slice(0, 12)}
              </div>
            ) : null}
            {importResult != null ? (
              <div className="text-xs text-text-subtle">
                Imported {importResult.workspace.name}
                {importResult.replacedExisting ? " and replaced existing data" : ""}
              </div>
            ) : null}
          </VStack>
        </div>
      </VStack>
    </WorkspacePanel>
  );
}

function selectOptions<T extends { id: string }>(
  items: T[],
  label: (item: T) => string,
) {
  return items.map((item) => ({ label: label(item), value: item.id }));
}
