import { fireAndForget } from "./lib/fireAndForget";
import {
  loadYakuAppSettings,
  YAKU_SETTINGS_CHANGED_EVENT,
  type YakuAppSettings,
} from "./lib/yaku-settings";

function setFonts(settings: YakuAppSettings) {
  document.documentElement.style.setProperty("--font-family-editor", settings.editorFont ?? "");
  document.documentElement.style.setProperty(
    "--font-family-interface",
    settings.interfaceFont ?? "",
  );
}

window.addEventListener(YAKU_SETTINGS_CHANGED_EVENT, (event) => {
  setFonts((event as CustomEvent<YakuAppSettings>).detail);
});

fireAndForget(loadYakuAppSettings().then((settings) => setFonts(settings)));
