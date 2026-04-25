import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { patchModel, settingsAtom } from "@yaakapp-internal/models";
import { useAtomValue } from "jotai";
import { activeWorkspaceAtom } from "../../hooks/useActiveWorkspace";
import { useCheckForUpdates } from "../../hooks/useCheckForUpdates";
import { appInfo } from "../../lib/appInfo";
import { useTranslate } from "../../lib/i18n";
import { revealInFinderText } from "../../lib/reveal";
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
  const workspace = useAtomValue(activeWorkspaceAtom);
  const settings = useAtomValue(settingsAtom);
  const checkForUpdates = useCheckForUpdates();
  const t = useTranslate();

  if (settings == null || workspace == null) {
    return null;
  }

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
            onChange={(updateChannel) => patchModel(settings, { updateChannel })}
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
          onChange={(v) => patchModel(settings, { autoupdate: v === "auto" })}
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
          onChange={(autoDownloadUpdates) => patchModel(settings, { autoDownloadUpdates })}
        />

        <Checkbox
          className="pl-2 mt-1 ml-[14rem]"
          checked={settings.checkNotifications}
          title={t("settings.general.checkNotifications")}
          help={t("settings.general.checkNotificationsHelp")}
          onChange={(checkNotifications) => patchModel(settings, { checkNotifications })}
        />
        <Checkbox
          disabled
          className="pl-2 mt-1 ml-[14rem]"
          checked={false}
          title={t("settings.general.sendAnonymousStats")}
          help={t("settings.general.sendAnonymousStatsHelp")}
          onChange={(checkNotifications) => patchModel(settings, { checkNotifications })}
        />
      </CargoFeature>

      <Separator className="my-4" />

      <Heading level={2}>
        {t("settings.general.workspaceTitle")}{" "}
        <div className="inline-block ml-1 bg-surface-highlight px-2 py-0.5 rounded text text-shrink">
          {workspace.name}
        </div>
      </Heading>
      <VStack className="mt-1 w-full" space={3}>
        <PlainInput
          required
          size="sm"
          name="requestTimeout"
          label={t("settings.general.requestTimeout")}
          labelClassName="w-[14rem]"
          placeholder="0"
          labelPosition="left"
          defaultValue={`${workspace.settingRequestTimeout}`}
          validate={(value) => Number.parseInt(value, 10) >= 0}
          onChange={(v) =>
            patchModel(workspace, { settingRequestTimeout: Number.parseInt(v, 10) || 0 })
          }
          type="number"
        />

        <Checkbox
          checked={workspace.settingValidateCertificates}
          help={t("settings.general.validateCertificatesHelp")}
          title={t("settings.general.validateCertificates")}
          onChange={(settingValidateCertificates) =>
            patchModel(workspace, { settingValidateCertificates })
          }
        />

        <Checkbox
          checked={workspace.settingFollowRedirects}
          title={t("settings.general.followRedirects")}
          onChange={(settingFollowRedirects) =>
            patchModel(workspace, {
              settingFollowRedirects,
            })
          }
        />
      </VStack>

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
