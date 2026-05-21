import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect } from "react";
import { useYakuSettings } from "../lib/yaku-settings";

export function useSyncFontSizeSetting() {
  const settings = useYakuSettings();
  useEffect(() => {
    const { interfaceScale, editorFontSize } = settings;
    getCurrentWebviewWindow().setZoom(interfaceScale).catch(console.error);
    document.documentElement.style.setProperty("--editor-font-size", `${editorFontSize}px`);
  }, [settings]);
}
