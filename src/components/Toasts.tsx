import { useAtomValue } from "jotai";
import type { ReactNode } from "react";
import { lazy, Suspense } from "react";
import { toastsAtom } from "../lib/toast";
import type { ToastProps } from "./core/Toast";

const ToastList = lazy(() => import("./ToastList").then((m) => ({ default: m.ToastList })));

export type ToastInstance = {
  id: string;
  uniqueKey: string;
  message: ReactNode;
  timeout: 3000 | 5000 | 8000 | (number & {}) | null;
  onClose?: ToastProps["onClose"];
} & Omit<ToastProps, "onClose" | "open" | "children" | "timeout">;

export const Toasts = () => {
  const toasts = useAtomValue(toastsAtom);
  if (toasts.length === 0) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <ToastList toasts={toasts} />
    </Suspense>
  );
};
