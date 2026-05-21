import { useSubscribeHotKeys } from "../hooks/useHotKey";
import { useSyncFontSizeSetting } from "../hooks/useSyncFontSizeSetting";
import { useSyncZoomSetting } from "../hooks/useSyncZoomSetting";
import { useYakuSettingsSync } from "../lib/yaku-settings";

export function GlobalHooks() {
  useYakuSettingsSync();
  useSyncZoomSetting();
  useSyncFontSizeSetting();

  useSubscribeHotKeys();

  return null;
}
