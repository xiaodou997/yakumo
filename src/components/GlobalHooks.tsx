import { useSubscribeHotKeys } from "../hooks/useHotKey";
import { useSubscribeHttpAuthentication } from "../hooks/useHttpAuthentication";
import { useSyncFontSizeSetting } from "../hooks/useSyncFontSizeSetting";
import { useSyncZoomSetting } from "../hooks/useSyncZoomSetting";
import { useSubscribeTemplateFunctions } from "../hooks/useTemplateFunctions";

export function GlobalHooks() {
  useSyncZoomSetting();
  useSyncFontSizeSetting();

  useSubscribeTemplateFunctions();
  useSubscribeHttpAuthentication();

  useSubscribeHotKeys();

  return null;
}
