import { useCallback } from "react";
import { useUpdateYakuSettings, useYakuSettings } from "../lib/yaku-settings";

export function useZoom() {
  const settings = useYakuSettings();
  const updateSettings = useUpdateYakuSettings();

  const zoomIn = useCallback(async () => {
    await updateSettings.mutateAsync({
      interfaceScale: Math.min(1.8, settings.interfaceScale * 1.1),
    });
  }, [settings.interfaceScale, updateSettings]);

  const zoomOut = useCallback(async () => {
    await updateSettings.mutateAsync({
      interfaceScale: Math.max(0.4, settings.interfaceScale * 0.9),
    });
  }, [settings.interfaceScale, updateSettings]);

  const zoomReset = useCallback(async () => {
    await updateSettings.mutateAsync({ interfaceScale: 1 });
  }, [updateSettings]);

  return { zoomIn, zoomOut, zoomReset };
}
