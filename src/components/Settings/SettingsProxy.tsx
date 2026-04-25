import { patchModel, settingsAtom } from "@yakumo-internal/models";
import { useAtomValue } from "jotai";

import { useTranslate } from "../../lib/i18n";
import { Checkbox } from "../core/Checkbox";
import { Heading } from "../core/Heading";
import { InlineCode } from "../core/InlineCode";
import { PlainInput } from "../core/PlainInput";
import { Select } from "../core/Select";
import { Separator } from "../core/Separator";
import { HStack, VStack } from "../core/Stacks";

export function SettingsProxy() {
  const settings = useAtomValue(settingsAtom);
  const t = useTranslate();

  return (
    <VStack space={1.5} className="mb-4">
      <div className="mb-3">
        <Heading>{t("settings.proxy")}</Heading>
        <p className="text-text-subtle">
          {t("settings.proxy.description")}
        </p>
      </div>
      <Select
        name="proxy"
        label={t("settings.proxy")}
        hideLabel
        size="sm"
        value={settings.proxy?.type ?? "automatic"}
        onChange={async (v) => {
          if (v === "automatic") {
            await patchModel(settings, { proxy: undefined });
          } else if (v === "enabled") {
            await patchModel(settings, {
              proxy: {
                disabled: false,
                type: "enabled",
                http: "",
                https: "",
                auth: { user: "", password: "" },
                bypass: "",
              },
            });
          } else {
            await patchModel(settings, { proxy: { type: "disabled" } });
          }
        }}
        options={[
          { label: t("settings.proxy.automatic"), value: "automatic" },
          { label: t("settings.proxy.custom"), value: "enabled" },
          { label: t("settings.proxy.disabled"), value: "disabled" },
        ]}
      />
      {settings.proxy?.type === "enabled" && (
        <VStack space={1.5}>
          <Checkbox
            className="my-3"
            checked={!settings.proxy.disabled}
            title={t("settings.proxy.enable")}
            help={t("settings.proxy.enableHelp")}
            onChange={async (enabled) => {
              const { proxy } = settings;
              const http = proxy?.type === "enabled" ? proxy.http : "";
              const https = proxy?.type === "enabled" ? proxy.https : "";
              const bypass = proxy?.type === "enabled" ? proxy.bypass : "";
              const auth = proxy?.type === "enabled" ? proxy.auth : null;
              const disabled = !enabled;
              await patchModel(settings, {
                proxy: { type: "enabled", http, https, auth, disabled, bypass },
              });
            }}
          />
          <HStack space={1.5}>
            <PlainInput
              size="sm"
              label={
                <>
                  {t("settings.proxy.httpTraffic")}
                </>
              }
              placeholder="localhost:9090"
              defaultValue={settings.proxy?.http}
              onChange={async (http) => {
                const { proxy } = settings;
                const https = proxy?.type === "enabled" ? proxy.https : "";
                const bypass = proxy?.type === "enabled" ? proxy.bypass : "";
                const auth = proxy?.type === "enabled" ? proxy.auth : null;
                const disabled = proxy?.type === "enabled" ? proxy.disabled : false;
                await patchModel(settings, {
                  proxy: {
                    type: "enabled",
                    http,
                    https,
                    auth,
                    disabled,
                    bypass,
                  },
                });
              }}
            />
            <PlainInput
              size="sm"
              label={
                <>
                  {t("settings.proxy.httpsTraffic")}
                </>
              }
              placeholder="localhost:9090"
              defaultValue={settings.proxy?.https}
              onChange={async (https) => {
                const { proxy } = settings;
                const http = proxy?.type === "enabled" ? proxy.http : "";
                const bypass = proxy?.type === "enabled" ? proxy.bypass : "";
                const auth = proxy?.type === "enabled" ? proxy.auth : null;
                const disabled = proxy?.type === "enabled" ? proxy.disabled : false;
                await patchModel(settings, {
                  proxy: { type: "enabled", http, https, auth, disabled, bypass },
                });
              }}
            />
          </HStack>
          <Separator className="my-6" />
          <Checkbox
            checked={settings.proxy.auth != null}
            title={t("settings.proxy.enableAuth")}
            onChange={async (enabled) => {
              const { proxy } = settings;
              const http = proxy?.type === "enabled" ? proxy.http : "";
              const https = proxy?.type === "enabled" ? proxy.https : "";
              const disabled = proxy?.type === "enabled" ? proxy.disabled : false;
              const bypass = proxy?.type === "enabled" ? proxy.bypass : "";
              const auth = enabled ? { user: "", password: "" } : null;
              await patchModel(settings, {
                proxy: { type: "enabled", http, https, auth, disabled, bypass },
              });
            }}
          />

          {settings.proxy.auth != null && (
            <HStack space={1.5}>
              <PlainInput
                required
                size="sm"
                label={t("settings.proxy.user")}
                placeholder="myUser"
                defaultValue={settings.proxy.auth.user}
                onChange={async (user) => {
                  const { proxy } = settings;
                  const http = proxy?.type === "enabled" ? proxy.http : "";
                  const https = proxy?.type === "enabled" ? proxy.https : "";
                  const disabled = proxy?.type === "enabled" ? proxy.disabled : false;
                  const bypass = proxy?.type === "enabled" ? proxy.bypass : "";
                  const password = proxy?.type === "enabled" ? (proxy.auth?.password ?? "") : "";
                  const auth = { user, password };
                  await patchModel(settings, {
                    proxy: { type: "enabled", http, https, auth, disabled, bypass },
                  });
                }}
              />
              <PlainInput
                size="sm"
                label={t("settings.proxy.password")}
                type="password"
                placeholder="s3cretPassw0rd"
                defaultValue={settings.proxy.auth.password}
                onChange={async (password) => {
                  const { proxy } = settings;
                  const http = proxy?.type === "enabled" ? proxy.http : "";
                  const https = proxy?.type === "enabled" ? proxy.https : "";
                  const disabled = proxy?.type === "enabled" ? proxy.disabled : false;
                  const bypass = proxy?.type === "enabled" ? proxy.bypass : "";
                  const user = proxy?.type === "enabled" ? (proxy.auth?.user ?? "") : "";
                  const auth = { user, password };
                  await patchModel(settings, {
                    proxy: { type: "enabled", http, https, auth, disabled, bypass },
                  });
                }}
              />
            </HStack>
          )}
          {settings.proxy.type === "enabled" && (
            <>
              <Separator className="my-6" />
              <PlainInput
                label={t("settings.proxy.bypass")}
                help={t("settings.proxy.bypassHelp")}
                defaultValue={settings.proxy.bypass}
                placeholder={t("settings.proxy.bypassPlaceholder")}
                onChange={async (bypass) => {
                  const { proxy } = settings;
                  const http = proxy?.type === "enabled" ? proxy.http : "";
                  const https = proxy?.type === "enabled" ? proxy.https : "";
                  const disabled = proxy?.type === "enabled" ? proxy.disabled : false;
                  const user = proxy?.type === "enabled" ? (proxy.auth?.user ?? "") : "";
                  const password = proxy?.type === "enabled" ? (proxy.auth?.password ?? "") : "";
                  const auth = { user, password };
                  await patchModel(settings, {
                    proxy: { type: "enabled", http, https, auth, disabled, bypass },
                  });
                }}
              />
            </>
          )}
        </VStack>
      )}
    </VStack>
  );
}
