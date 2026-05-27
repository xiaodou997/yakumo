export function RequestConfigSummaryGrid({
  entries,
}: {
  entries: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {entries.map((entry) => (
        <div
          key={entry.label}
          className="rounded-lg border border-border-subtle bg-surface-highlight/40 px-2 py-2"
        >
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">
            {entry.label}
          </div>
          <div className="mt-1 break-words text-xs text-text">
            {entry.value}
          </div>
        </div>
      ))}
    </div>
  );
}
