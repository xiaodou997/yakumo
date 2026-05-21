import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useCheckForUpdates } from "../../hooks/useCheckForUpdates";
import { appInfo } from "../../lib/appInfo";
import { useTranslate } from "../../lib/i18n";
import { revealInFinderText } from "../../lib/reveal";
import { useUpdateYakuSettings, useYakuSettings } from "../../lib/yaku-settings";
import { CargoFeature } from "../CargoFeature";
import { Checkbox } from "../core/Checkbox";
import { Heading } from "../core/Heading";
import { IconButton } from "../core/IconButton";
import { KeyValueRow, KeyValueRows } from "../core/KeyValueRow";
import { PlainInput } from "../core/PlainInput";
import { Select } from "../core/Select";
import { Separator } from "../core/Separator";
import { VStack } from "../core/Stacks";

export function SettingsGeneral() {
  const settings = useYakuSettings();
  const updateSettings = useUpdateYakuSettings();
  const checkForUpdates = useCheckForUpdates();
  const t = useTranslate();

  return (
    <VStack space={1.5} className="mb-4">
      <div className="mb-4">
        <Heading>{t("settings.general")}</Heading>
        <p className="text-text-subtle">{t("settings.general.description")}</p>
      </div>
      <CargoFeature feature="updater">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1">
          <Select
            name="updateChannel"
            label={t("settings.general.updateChannel")}
            labelPosition="left"
            labelClassName="w-[14rem]"
            size="sm"
            value={settings.updateChannel}
            onChange={(updateChannel) => updateSettings.mutate({ updateChannel })}
            options={[
              { label: t("settings.general.updateChannel.stable"), value: "stable" },
              { label: t("settings.general.updateChannel.beta"), value: "beta" },
            ]}
          />
          <IconButton
            variant="border"
            size="sm"
            title={t("settings.general.checkForUpdates")}
            icon="refresh"
            spin={checkForUpdates.isPending}
            onClick={() => checkForUpdates.mutateAsync()}
          />
        </div>

        <Select
          name="autoupdate"
          value={settings.autoupdate ? "auto" : "manual"}
          label={t("settings.general.updateBehavior")}
          labelPosition="left"
          size="sm"
          labelClassName="w-[14rem]"
          onChange={(v) => updateSettings.mutate({ autoupdate: v === "auto" })}
          options={[
            { label: t("settings.general.updateBehavior.automatic"), value: "auto" },
            { label: t("settings.general.updateBehavior.manual"), value: "manual" },
          ]}
        />
        <Checkbox
          className="pl-2 mt-1 ml-[14rem]"
          checked={settings.autoDownloadUpdates}
          disabled={!settings.autoupdate}
          help={t("settings.general.autoDownloadUpdatesHelp")}
          title={t("settings.general.autoDownloadUpdates")}
          onChange={(autoDownloadUpdates) => updateSettings.mutate({ autoDownloadUpdates })}
        />

        <Checkbox
          className="pl-2 mt-1 ml-[14rem]"
          checked={settings.checkNotifications}
          title={t("settings.general.checkNotifications")}
          help={t("settings.general.checkNotificationsHelp")}
          onChange={(checkNotifications) => updateSettings.mutate({ checkNotifications })}
        />
        <Checkbox
          disabled
          className="pl-2 mt-1 ml-[14rem]"
          checked={false}
          title={t("settings.general.sendAnonymousStats")}
          help={t("settings.general.sendAnonymousStatsHelp")}
          onChange={() => {}}
        />
      </CargoFeature>

      <Separator className="my-4" />

      <Heading level={2}>{t("settings.general.appInfo")}</Heading>
      <KeyValueRows>
        <KeyValueRow label={t("settings.general.version")}>{appInfo.version}</KeyValueRow>
        <KeyValueRow
          label={t("settings.general.dataDirectory")}
          rightSlot={
            <IconButton
              title={revealInFinderText}
              icon="folder_open"
              size="2xs"
              onClick={() => revealItemInDir(appInfo.appDataDir)}
            />
          }
        >
          {appInfo.appDataDir}
        </KeyValueRow>
        <KeyValueRow
          label={t("settings.general.logsDirectory")}
          rightSlot={
            <IconButton
              title={revealInFinderText}
              icon="folder_open"
              size="2xs"
              onClick={() => revealItemInDir(appInfo.appLogDir)}
            />
          }
        >
          {appInfo.appLogDir}
        </KeyValueRow>
      </KeyValueRows>
    </VStack>
  );
}
