import { fireAndForget } from "./lib/fireAndForget";
import { loadYakuAppSettings, YAKU_SETTINGS_CHANGED_EVENT } from "./lib/yaku-settings";

function setFontSizeOnDocument(fontSize: number) {
  document.documentElement.style.fontSize = `${fontSize}px`;
}

window.addEventListener(YAKU_SETTINGS_CHANGED_EVENT, (event) => {
  const settings = (event as CustomEvent<Awaited<ReturnType<typeof loadYakuAppSettings>>>).detail;
  setFontSizeOnDocument(settings.interfaceFontSize);
});

fireAndForget(
  loadYakuAppSettings().then((settings) => setFontSizeOnDocument(settings.interfaceFontSize)),
);
