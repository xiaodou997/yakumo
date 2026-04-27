import { lazy, Suspense, useCallback } from "react";
import { toggleDialog } from "../lib/dialog";

const CommandPaletteDialog = lazy(() =>
  import("../components/CommandPaletteDialog").then((m) => ({
    default: m.CommandPaletteDialog,
  })),
);

export function useToggleCommandPalette() {
  const togglePalette = useCallback(() => {
    toggleDialog({
      id: "command_palette",
      size: "dynamic",
      hideX: true,
      className: "mb-auto mt-[4rem] !max-h-[min(30rem,calc(100vh-4rem))]",
      vAlign: "top",
      noPadding: true,
      noScroll: true,
      render: ({ hide }) => (
        <Suspense fallback={null}>
          <CommandPaletteDialog onClose={hide} />
        </Suspense>
      ),
    });
  }, []);

  return togglePalette;
}
