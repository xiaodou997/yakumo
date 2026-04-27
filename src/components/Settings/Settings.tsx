import { useSearch } from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { type } from "@tauri-apps/plugin-os";
import { useLicense } from "@yakumo-internal/license";
import { settingsAtom } from "@yakumo-internal/models";
import classNames from "classnames";
import { useAtomValue } from "jotai";
import { lazy, Suspense, useEffect, useState } from "react";
import { useDocumentKey } from "../../hooks/useDocumentKey";
import { appInfo } from "../../lib/appInfo";
import { useTranslate } from "../../lib/i18n";
import type { MessageKey } from "../../lib/i18n/messages";
import { CountBadge } from "../core/CountBadge";
import { Icon } from "../core/Icon";
import { HStack } from "../core/Stacks";
import { TabContent, type TabItem, Tabs } from "../core/Tabs/Tabs";
import { HeaderSize } from "../HeaderSize";

interface Props {
  hide?: () => void;
}

const TAB_GENERAL = "general";
const TAB_INTERFACE = "interface";
const TAB_SHORTCUTS = "shortcuts";
const TAB_CERTIFICATES = "certificates";
const TAB_PROXY = "proxy";
const TAB_LICENSE = "license";
const tabs = [
  TAB_GENERAL,
  TAB_INTERFACE,
  TAB_SHORTCUTS,
  TAB_CERTIFICATES,
  TAB_PROXY,
  TAB_LICENSE,
] as const;
export type SettingsTab = (typeof tabs)[number];

const SettingsGeneral = lazy(() =>
  import("./SettingsGeneral").then((m) => ({ default: m.SettingsGeneral })),
);
const SettingsInterface = lazy(() =>
  import("./SettingsInterface").then((m) => ({ default: m.SettingsInterface })),
);
const SettingsHotkeys = lazy(() =>
  import("./SettingsHotkeys").then((m) => ({ default: m.SettingsHotkeys })),
);
const SettingsCertificates = lazy(() =>
  import("./SettingsCertificates").then((m) => ({ default: m.SettingsCertificates })),
);
const SettingsProxy = lazy(() =>
  import("./SettingsProxy").then((m) => ({ default: m.SettingsProxy })),
);
const SettingsLicense = lazy(() =>
  import("./SettingsLicense").then((m) => ({ default: m.SettingsLicense })),
);

const tabLabels: Record<SettingsTab, MessageKey> = {
  [TAB_GENERAL]: "settings.general",
  [TAB_INTERFACE]: "settings.interface",
  [TAB_SHORTCUTS]: "settings.shortcuts",
  [TAB_CERTIFICATES]: "settings.certificates",
  [TAB_PROXY]: "settings.proxy",
  [TAB_LICENSE]: "settings.license",
};

function isSettingsTab(value: string | undefined): value is SettingsTab {
  return tabs.includes(value as SettingsTab);
}

export default function Settings({ hide }: Props) {
  const t = useTranslate();
  const { tab: tabFromQuery } = useSearch({
    from: "/workspaces/$workspaceId/settings",
  });
  const mainTab = tabFromQuery?.split(":")[0];
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    isSettingsTab(mainTab) ? mainTab : TAB_GENERAL,
  );
  const settings = useAtomValue(settingsAtom);
  const licenseCheck = useLicense();

  useEffect(() => {
    if (isSettingsTab(mainTab)) {
      setActiveTab(mainTab);
    }
  }, [mainTab]);

  // Close settings window on escape
  // TODO: Could this be put in a better place? Eg. in Rust key listener when creating the window
  useDocumentKey("Escape", async () => {
    if (hide != null) {
      // It's being shown in a dialog, so close the dialog
      hide();
    } else {
      // It's being shown in a window, so close the window
      await getCurrentWebviewWindow().close();
    }
  });

  return (
    <div className={classNames("grid grid-rows-[auto_minmax(0,1fr)] h-full")}>
      {hide ? (
        <span />
      ) : (
        <HeaderSize
          data-tauri-drag-region
          ignoreControlsSpacing
          onlyXWindowControl
          size="md"
          className="x-theme-appHeader bg-surface text-text-subtle flex items-center justify-center border-b border-border-subtle text-sm font-semibold"
        >
          <HStack
            space={2}
            justifyContent="center"
            className="w-full h-full grid grid-cols-[1fr_auto] pointer-events-none"
          >
            <div
              className={classNames(
                type() === "macos" ? "text-center" : "pl-2",
              )}
            >
              {t("common.settings")}
            </div>
          </HStack>
        </HeaderSize>
      )}
      <Tabs
        layout="horizontal"
        defaultValue={activeTab}
        onChangeValue={(value) => {
          if (isSettingsTab(value)) {
            setActiveTab(value);
          }
        }}
        addBorders
        tabListClassName="min-w-[10rem] bg-surface x-theme-sidebar border-r border-border pl-3"
        label={t("common.settings")}
        tabs={tabs.map(
          (value): TabItem => ({
            value,
            label: t(tabLabels[value]),
            hidden: !appInfo.featureLicense && value === TAB_LICENSE,
            leftSlot:
              value === TAB_GENERAL ? (
                <Icon icon="settings" className="text-secondary" />
              ) : value === TAB_INTERFACE ? (
                <Icon icon="columns_2" className="text-secondary" />
              ) : value === TAB_SHORTCUTS ? (
                <Icon icon="keyboard" className="text-secondary" />
              ) : value === TAB_CERTIFICATES ? (
                <Icon icon="shield_check" className="text-secondary" />
              ) : value === TAB_PROXY ? (
                <Icon icon="wifi" className="text-secondary" />
              ) : value === TAB_LICENSE ? (
                <Icon icon="key_round" className="text-secondary" />
              ) : null,
            rightSlot:
              value === TAB_CERTIFICATES ? (
                <CountBadge count={settings.clientCertificates.length} />
              ) : value === TAB_PROXY && settings.proxy?.type === "enabled" ? (
                <CountBadge count />
              ) : value === TAB_LICENSE &&
                licenseCheck.check.data?.status === "personal_use" ? (
                <CountBadge count color="notice" />
              ) : null,
          }),
        )}
      >
        <SettingsTabContent value={activeTab} />
      </Tabs>
    </div>
  );
}

export function SettingsTabContent({ value }: { value: SettingsTab }) {
  return (
    <TabContent value={value} className="overflow-y-auto h-full px-6 !py-4">
      <Suspense fallback={<div className="text-text-subtle">Loading...</div>}>
        {value === TAB_GENERAL ? (
          <SettingsGeneral />
        ) : value === TAB_INTERFACE ? (
          <SettingsInterface />
        ) : value === TAB_SHORTCUTS ? (
          <SettingsHotkeys />
        ) : value === TAB_CERTIFICATES ? (
          <SettingsCertificates />
        ) : value === TAB_PROXY ? (
          <SettingsProxy />
        ) : (
          <SettingsLicense />
        )}
      </Suspense>
    </TabContent>
  );
}
