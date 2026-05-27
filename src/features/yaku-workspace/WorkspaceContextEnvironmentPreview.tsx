export function WorkspaceContextEnvironmentPreview({
  selectedEnvironmentVariables,
}: {
  selectedEnvironmentVariables: Record<string, unknown>;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="mb-1 text-xs uppercase tracking-[0.2em] text-text-subtlest">
        Environment Variables
      </div>
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs text-text-subtle">
        {JSON.stringify(selectedEnvironmentVariables, null, 2)}
      </pre>
    </div>
  );
}
