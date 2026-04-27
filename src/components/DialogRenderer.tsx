import { useCallback } from "react";
import { hideDialog } from "../lib/dialog";
import type { DialogInstance } from "./Dialogs";
import { ErrorBoundary } from "./ErrorBoundary";
import { Dialog } from "./core/Dialog";

export function DialogRenderer({ render: Component, onClose, id, ...props }: DialogInstance) {
  const hide = useCallback(() => {
    hideDialog(id);
  }, [id]);

  const handleClose = useCallback(() => {
    onClose?.();
    hideDialog(id);
  }, [id, onClose]);

  return (
    <Dialog open onClose={handleClose} {...props}>
      <ErrorBoundary name={`Dialog ${id}`}>
        <Component hide={hide} {...props} />
      </ErrorBoundary>
    </Dialog>
  );
}
