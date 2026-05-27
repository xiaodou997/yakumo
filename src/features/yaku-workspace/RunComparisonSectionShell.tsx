import type { ReactNode } from "react";

export function RunComparisonSectionShell({
  title,
  isReady,
  loadingLabel,
  children,
}: {
  title: string;
  isReady: boolean;
  loadingLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-3 rounded-lg border border-border-subtle bg-surface px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">{title}</div>
      {!isReady ? (
        <div className="mt-3 text-xs text-text-subtle">{loadingLabel}</div>
      ) : (
        children
      )}
    </div>
  );
}
