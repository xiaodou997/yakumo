import { useAtomValue } from "jotai";
import type { ComponentType } from "react";
import { lazy, Suspense } from "react";
import { dialogsAtom } from "../lib/dialog";
import type { DialogProps } from "./core/Dialog";

const DialogRenderer = lazy(() =>
  import("./DialogRenderer").then((m) => ({ default: m.DialogRenderer })),
);

export type DialogInstance = {
  id: string;
  render: ComponentType<{ hide: () => void }>;
} & Omit<DialogProps, "open" | "children">;

export function Dialogs() {
  const dialogs = useAtomValue(dialogsAtom);
  if (dialogs.length === 0) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      {dialogs.map(({ id, ...props }) => (
        <DialogRenderer key={id} id={id} {...props} />
      ))}
    </Suspense>
  );
}
