import { hideToast } from "../lib/toast";
import { ErrorBoundary } from "./ErrorBoundary";
import type { ToastInstance } from "./Toasts";
import { Portal } from "./Portal";
import { Toast } from "./core/Toast";

interface Props {
  toasts: ToastInstance[];
}

export function ToastList({ toasts }: Props) {
  return (
    <Portal name="toasts">
      <div className="absolute right-0 bottom-0 z-50">
        {toasts.map((toast) => {
          const { message, uniqueKey, ...props } = toast;
          return (
            <ErrorBoundary key={uniqueKey} name={`Toast ${uniqueKey}`}>
              <Toast
                open
                {...props}
                // We call onClose inside actions.hide instead of passing to toast so that
                // it gets called from external close calls as well
                onClose={() => hideToast(toast)}
              >
                {message}
              </Toast>
            </ErrorBoundary>
          );
        })}
      </div>
    </Portal>
  );
}
