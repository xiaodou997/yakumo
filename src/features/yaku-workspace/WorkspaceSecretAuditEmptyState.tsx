import { EmptyCopy } from "./WorkspacePanels";

export function WorkspaceSecretAuditEmptyState({
  selectedWorkspaceId,
  error,
  cleanupMessage,
  hasAuditItems,
  hasFilteredItems,
}: {
  selectedWorkspaceId: string | null | undefined;
  error: unknown;
  cleanupMessage: string | null;
  hasAuditItems: boolean;
  hasFilteredItems: boolean;
}) {
  if (error != null) {
    return <div className="text-xs text-danger">{String(error)}</div>;
  }
  if (cleanupMessage != null) {
    return <div className="text-xs text-text-subtle">{cleanupMessage}</div>;
  }
  if (selectedWorkspaceId == null) {
    return <EmptyCopy>Select a workspace to inspect request secrets.</EmptyCopy>;
  }
  if (!hasAuditItems) {
    return <EmptyCopy>No auth secrets in this workspace.</EmptyCopy>;
  }
  if (!hasFilteredItems) {
    return <EmptyCopy>No secrets match the current filters.</EmptyCopy>;
  }
  return null;
}
