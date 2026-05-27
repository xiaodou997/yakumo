import { Button } from "../../components/core/Button";
import { HStack, VStack } from "../../components/core/Stacks";
import type {
  YakuBackupImportResponse,
  YakuBackupManifest,
} from "../../lib/yaku-client";

export function WorkspaceContextBackupCard({
  selectedWorkspaceId,
  exportResult,
  importResult,
  isExportingBackup,
  isImportingBackup,
  onExportBackup,
  onImportBackup,
}: {
  selectedWorkspaceId: string | null | undefined;
  exportResult?: YakuBackupManifest;
  importResult?: YakuBackupImportResponse;
  isExportingBackup: boolean;
  isImportingBackup: boolean;
  onExportBackup: () => void;
  onImportBackup: () => void;
}) {
  return (
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
  );
}
