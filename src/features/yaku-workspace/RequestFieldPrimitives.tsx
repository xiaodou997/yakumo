import type { ReactNode } from "react";
import { Button } from "../../components/core/Button";
import { HStack } from "../../components/core/Stacks";
import { createConfigPair, updateConfigPair } from "./requestConfig";
import type { ConfigPair } from "./types";

export const fieldClassName =
  "min-h-sm w-full rounded-md border border-border-subtle bg-surface px-2 text-xs font-mono text-text outline-none focus:border-border-focus placeholder:text-placeholder";

export const textareaClassName =
  "w-full resize-y rounded-md border border-border-subtle bg-surface p-2 text-xs font-mono text-text outline-none focus:border-border-focus";

export function PairListEditor({
  title,
  pairs,
  setPairs,
  includeEnabled = false,
  namePlaceholder,
  valuePlaceholder,
}: {
  title: string;
  pairs: ConfigPair[];
  setPairs: (pairs: ConfigPair[]) => void;
  includeEnabled?: boolean;
  namePlaceholder: string;
  valuePlaceholder: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <HStack justifyContent="between" alignItems="center" className="gap-2">
        <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">{title}</div>
        <Button
          size="2xs"
          variant="border"
          onClick={() => setPairs([...pairs, createConfigPair()])}
        >
          Add
        </Button>
      </HStack>
      <div className="mt-3 space-y-2">
        {pairs.length === 0 ? (
          <EmptyCopy>No rows yet.</EmptyCopy>
        ) : (
          pairs.map((pair, index) => (
            <div
              key={pair.id}
              className="grid gap-2 rounded-lg border border-border-subtle bg-surface-highlight/35 p-2 md:grid-cols-[1fr_1fr_auto]"
            >
              <input
                value={pair.name}
                onChange={(event) =>
                  updateConfigPair(pairs, setPairs, pair.id, { name: event.target.value })
                }
                placeholder={namePlaceholder}
                className={fieldClassName}
              />
              <div className="flex gap-2 max-md:flex-col">
                <input
                  value={pair.value}
                  onChange={(event) =>
                    updateConfigPair(pairs, setPairs, pair.id, { value: event.target.value })
                  }
                  placeholder={valuePlaceholder}
                  className={fieldClassName}
                />
                {includeEnabled ? (
                  <label className="flex items-center gap-2 whitespace-nowrap text-xs text-text-subtle">
                    <input
                      type="checkbox"
                      checked={pair.enabled !== false}
                      onChange={(event) =>
                        updateConfigPair(pairs, setPairs, pair.id, {
                          enabled: event.target.checked,
                        })
                      }
                    />
                    Enabled
                  </label>
                ) : null}
              </div>
              <Button
                size="2xs"
                variant="border"
                color="danger"
                onClick={() => setPairs(pairs.filter((_, currentIndex) => currentIndex !== index))}
              >
                Remove
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function CheckboxField({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-subtle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {children}
    </label>
  );
}

function EmptyCopy({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-border-subtle p-3 text-xs text-text-subtle">{children}</div>;
}
