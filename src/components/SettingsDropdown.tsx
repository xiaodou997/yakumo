import { openUrl } from "@tauri-apps/plugin-opener";
import { useLicense } from "@yakumo-internal/license";
import { useRef } from "react";
import { openSettings } from "../commands/openSettings";
import { useCheckForUpdates } from "../hooks/useCheckForUpdates";
import { appInfo } from "../lib/appInfo";
import { showDialog } from "../lib/dialog";
import { useTranslate } from "../lib/i18n";
import type { DropdownRef } from "./core/Dropdown";
import { Dropdown } from "./core/Dropdown";
import { Icon } from "./core/Icon";
import { IconButton } from "./core/IconButton";

export function SettingsDropdown() {
  const t = useTranslate();
  const dropdownRef = useRef<DropdownRef>(null);
  const checkForUpdates = useCheckForUpdates();
  const { check } = useLicense();

  return (
    <Dropdown
      ref={dropdownRef}
      items={[
        {
          label: t("common.settings"),
          hotKeyAction: "settings.show",
          leftSlot: <Icon icon="settings" />,
          onSelect: () => openSettings.mutate(null),
        },
        {
          label: t("settings.menu.keyboardShortcuts"),
          hotKeyAction: "hotkeys.showHelp",
          leftSlot: <Icon icon="keyboard" />,
          onSelect: async () => {
            const { KeyboardShortcutsDialog } = await import("./KeyboardShortcutsDialog");
            showDialog({
              id: "hotkey",
              title: t("settings.menu.keyboardShortcuts"),
              size: "dynamic",
              render: () => <KeyboardShortcutsDialog />,
            });
          },
        },
        { type: "separator", label: t("settings.menu.shareWorkspaces") },
        {
          label: t("settings.menu.importData"),
          leftSlot: <Icon icon="folder_input" />,
          onSelect: async () => {
            const { importData } = await import("../lib/importData");
            importData.mutate();
          },
        },
        {
          label: t("settings.menu.exportData"),
          leftSlot: <Icon icon="folder_output" />,
          onSelect: async () => {
            const { exportData } = await import("../hooks/useExportData");
            exportData.mutate();
          },
        },
        { type: "separator", label: `Yakumo API v${appInfo.version}` },
        {
          label: t("settings.menu.checkForUpdates"),
          leftSlot: <Icon icon="update" />,
          hidden: !appInfo.featureUpdater,
          onSelect: () => checkForUpdates.mutate(),
        },
        {
          label: t("settings.menu.purchaseLicense"),
          color: "success",
          hidden: check.data == null || check.data.status === "active",
          leftSlot: <Icon icon="circle_dollar_sign" />,
          rightSlot: (
            <Icon icon="external_link" color="success" className="opacity-60" />
          ),
          onSelect: () => openUrl("https://github.com/xiaodou997/yakumo"),
        },
        {
          label: t("settings.menu.installCli"),
          hidden: appInfo.cliVersion != null,
          leftSlot: <Icon icon="square_terminal" />,
          rightSlot: <Icon icon="external_link" color="secondary" />,
          onSelect: () => openUrl("https://github.com/xiaodou997/yakumo"),
        },
      ]}
    >
      <IconButton
        size="sm"
        title={t("settings.menu.mainMenu")}
        icon="settings"
        iconColor="secondary"
        className="pointer-events-auto"
      />
    </Dropdown>
  );
}
