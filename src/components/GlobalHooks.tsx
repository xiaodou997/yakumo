import { useSubscribeHotKeys } from "../hooks/useHotKey";
import { useSubscribeHttpAuthentication } from "../hooks/useHttpAuthentication";
import { useSyncFontSizeSetting } from "../hooks/useSyncFontSizeSetting";
import { useSyncZoomSetting } from "../hooks/useSyncZoomSetting";
import { useSubscribeTemplateFunctions } from "../hooks/useTemplateFunctions";
import { useYakuSettingsSync } from "../lib/yaku-settings";

export function GlobalHooks() {
  useYakuSettingsSync();
  useSyncZoomSetting();
  useSyncFontSizeSetting();

  useSubscribeTemplateFunctions();
  useSubscribeHttpAuthentication();

  useSubscribeHotKeys();

  return null;
}
