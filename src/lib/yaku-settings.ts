import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import {
  getYakuSetting,
  setYakuSetting,
  yakuQueryKeys,
  type YakuAppSettings,
  type YakuClientCertificate,
  type YakuProxySetting,
} from "./yaku-client";
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
    clientCertificates: normalizeClientCertificates(input.clientCertificates),
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
    proxy: normalizeProxy(input.proxy),
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

function normalizeClientCertificates(value: unknown): YakuClientCertificate[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((item) => ({
      host: stringOr(item.host, ""),
      port: numberOrNull(item.port),
      crtFile: stringOrNull(item.crtFile),
      keyFile: stringOrNull(item.keyFile),
      pfxFile: stringOrNull(item.pfxFile),
      passphrase: stringOrNull(item.passphrase),
      enabled: typeof item.enabled === "boolean" ? item.enabled : true,
    }));
}

function normalizeProxy(value: unknown): YakuProxySetting | null {
  if (!isRecord(value)) return null;
  if (value.type === "disabled") {
    return { type: "disabled" };
  }
  if (value.type !== "enabled") {
    return null;
  }
  const auth = isRecord(value.auth)
    ? {
        user: stringOr(value.auth.user, ""),
        password: stringOr(value.auth.password, ""),
      }
    : null;
  return {
    type: "enabled",
    http: stringOr(value.http, ""),
    https: stringOr(value.https, ""),
    auth,
    bypass: stringOr(value.bypass, ""),
    disabled: typeof value.disabled === "boolean" ? value.disabled : false,
  };
}

function isEditorKeymap(value: unknown): value is YakuAppSettings["editorKeymap"] {
  return value === "default" || value === "vim" || value === "vscode" || value === "emacs";
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
