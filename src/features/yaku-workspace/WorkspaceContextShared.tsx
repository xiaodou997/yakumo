export function WorkspaceContextStatBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-2 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">{label}</div>
      <div className="mt-1 break-words text-[11px] text-text">{value}</div>
    </div>
  );
}
