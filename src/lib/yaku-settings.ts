import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { getYakuSetting, setYakuSetting, yakuQueryKeys, type YakuAppSettings } from "./yaku-client";
import { jotaiStore } from "./jotai";

export const YAKU_APP_SETTINGS_KEY = "app.settings";

export const defaultYakuAppSettings: YakuAppSettings = {
  appearance: "system",
  autoupdate: true,
  autoDownloadUpdates: true,
  checkNotifications: true,
  clientCertificates: [],
  coloredMethods: false,
  editorFont: null,
  editorFontSize: 12,
  editorKeymap: "default",
  editorSoftWrap: true,
  hideLicenseBadge: false,
  hideWindowControls: false,
  hotkeys: {},
  interfaceFont: null,
  interfaceFontSize: 14,
  interfaceScale: 1,
  language: "system",
  openWorkspaceNewWindow: null,
  proxy: null,
  themeDark: "yakumo-dark",
  themeLight: "yakumo-light",
  updateChannel: "stable",
  useNativeTitlebar: false,
};

export const yakuSettingsAtom = atom<YakuAppSettings>(defaultYakuAppSettings);

export function normalizeYakuAppSettings(value: unknown): YakuAppSettings {
  const input = isRecord(value) ? value : {};
  return {
    ...defaultYakuAppSettings,
    ...input,
    autoupdate: typeof input.autoupdate === "boolean" ? input.autoupdate : defaultYakuAppSettings.autoupdate,
    autoDownloadUpdates:
      typeof input.autoDownloadUpdates === "boolean"
        ? input.autoDownloadUpdates
        : defaultYakuAppSettings.autoDownloadUpdates,
    checkNotifications:
      typeof input.checkNotifications === "boolean"
        ? input.checkNotifications
        : defaultYakuAppSettings.checkNotifications,
    clientCertificates: Array.isArray(input.clientCertificates)
      ? input.clientCertificates
      : defaultYakuAppSettings.clientCertificates,
    coloredMethods:
      typeof input.coloredMethods === "boolean"
        ? input.coloredMethods
        : defaultYakuAppSettings.coloredMethods,
    editorFont: typeof input.editorFont === "string" ? input.editorFont : null,
    editorFontSize: numberOr(input.editorFontSize, defaultYakuAppSettings.editorFontSize),
    editorKeymap: isEditorKeymap(input.editorKeymap)
      ? input.editorKeymap
      : defaultYakuAppSettings.editorKeymap,
    editorSoftWrap:
      typeof input.editorSoftWrap === "boolean"
        ? input.editorSoftWrap
        : defaultYakuAppSettings.editorSoftWrap,
    hideLicenseBadge:
      typeof input.hideLicenseBadge === "boolean"
        ? input.hideLicenseBadge
        : defaultYakuAppSettings.hideLicenseBadge,
    hideWindowControls:
      typeof input.hideWindowControls === "boolean"
        ? input.hideWindowControls
        : defaultYakuAppSettings.hideWindowControls,
    hotkeys: isRecord(input.hotkeys) ? normalizeHotkeys(input.hotkeys) : {},
    interfaceFont: typeof input.interfaceFont === "string" ? input.interfaceFont : null,
    interfaceFontSize: numberOr(input.interfaceFontSize, defaultYakuAppSettings.interfaceFontSize),
    interfaceScale: numberOr(input.interfaceScale, defaultYakuAppSettings.interfaceScale),
    language: typeof input.language === "string" ? input.language : defaultYakuAppSettings.language,
    openWorkspaceNewWindow:
      typeof input.openWorkspaceNewWindow === "boolean" ? input.openWorkspaceNewWindow : null,
    proxy: isRecord(input.proxy) ? (input.proxy as YakuAppSettings["proxy"]) : null,
    themeDark: typeof input.themeDark === "string" ? input.themeDark : defaultYakuAppSettings.themeDark,
    themeLight:
      typeof input.themeLight === "string" ? input.themeLight : defaultYakuAppSettings.themeLight,
    updateChannel:
      typeof input.updateChannel === "string"
        ? input.updateChannel
        : defaultYakuAppSettings.updateChannel,
    useNativeTitlebar:
      typeof input.useNativeTitlebar === "boolean"
        ? input.useNativeTitlebar
        : defaultYakuAppSettings.useNativeTitlebar,
  };
}

export function getCurrentYakuSettings() {
  return jotaiStore.get(yakuSettingsAtom);
}

export function useYakuSettings() {
  return useAtomValue(yakuSettingsAtom);
}

export function useYakuSettingsSync() {
  const setSettings = useSetAtom(yakuSettingsAtom);
  const query = useQuery({
    queryKey: yakuQueryKeys.setting(YAKU_APP_SETTINGS_KEY),
    queryFn: async () => normalizeYakuAppSettings((await getYakuSetting(YAKU_APP_SETTINGS_KEY))?.value),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (query.data != null) {
      setSettings(query.data);
    }
  }, [query.data, setSettings]);
}

export function useUpdateYakuSettings() {
  const queryClient = useQueryClient();
  const setSettings = useSetAtom(yakuSettingsAtom);
  return useMutation({
    mutationFn: async (patch: Partial<YakuAppSettings>) => {
      const next = normalizeYakuAppSettings({ ...getCurrentYakuSettings(), ...patch });
      await setYakuSetting(YAKU_APP_SETTINGS_KEY, next);
      return next;
    },
    onSuccess: (settings) => {
      setSettings(settings);
      queryClient.setQueryData(yakuQueryKeys.setting(YAKU_APP_SETTINGS_KEY), settings);
    },
  });
}

function normalizeHotkeys(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string[]] =>
      Array.isArray(entry[1]) && entry[1].every((item) => typeof item === "string"),
    ),
  );
}

function isEditorKeymap(value: unknown): value is YakuAppSettings["editorKeymap"] {
  return value === "default" || value === "vim" || value === "vscode" || value === "emacs";
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
