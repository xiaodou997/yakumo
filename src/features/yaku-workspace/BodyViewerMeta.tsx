export function BodyMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface px-3 py-2">
      <div className="text-xs uppercase tracking-[0.18em] text-text-subtlest">{label}</div>
      <div className="mt-1 truncate text-sm text-text">{value}</div>
    </div>
  );
}
