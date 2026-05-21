import type { ReactNode } from "react";
import { Heading } from "../../components/core/Heading";
import { VStack } from "../../components/core/Stacks";

export function WorkspacePanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-highlight/35 p-4">
      <VStack space={3}>
        <VStack space={1}>
          <Heading level={3}>{title}</Heading>
          <p className="text-sm text-text-subtle">{subtitle}</p>
        </VStack>
        {children}
      </VStack>
    </section>
  );
}

export function EmptyCopy({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border-subtle bg-surface px-3 py-6 text-center text-sm text-text-subtle">
      {children}
    </div>
  );
}

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs uppercase tracking-[0.18em] text-text-subtlest">
      {children}
    </label>
  );
}
