import { openUrl } from "@tauri-apps/plugin-opener";
import { useLicense } from "@yaakapp-internal/license";
import { useRef } from "react";
import { openSettings } from "../commands/openSettings";
import { useCheckForUpdates } from "../hooks/useCheckForUpdates";
import { useExportData } from "../hooks/useExportData";
import { appInfo } from "../lib/appInfo";
import { showDialog } from "../lib/dialog";
import { useTranslate } from "../lib/i18n";
import { importData } from "../lib/importData";
import type { DropdownRef } from "./core/Dropdown";
import { Dropdown } from "./core/Dropdown";
import { Icon } from "./core/Icon";
import { IconButton } from "./core/IconButton";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";

export function SettingsDropdown() {
  const t = useTranslate();
  const exportData = useExportData();
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
          onSelect: () => {
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
          onSelect: () => importData.mutate(),
        },
        {
          label: t("settings.menu.exportData"),
          leftSlot: <Icon icon="folder_output" />,
          onSelect: () => exportData.mutate(),
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
          onSelect: () => openUrl("https://yaak.app/pricing"),
        },
        {
          label: t("settings.menu.installCli"),
          hidden: appInfo.cliVersion != null,
          leftSlot: <Icon icon="square_terminal" />,
          rightSlot: <Icon icon="external_link" color="secondary" />,
          onSelect: () => openUrl("https://yaak.app/docs/cli"),
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
