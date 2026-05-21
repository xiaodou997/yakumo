import { useTranslate } from "../../lib/i18n";
import { useUpdateYakuSettings, useYakuSettings } from "../../lib/yaku-settings";
import type { YakuProxySetting } from "../../lib/yaku-client";
import { Checkbox } from "../core/Checkbox";
import { Heading } from "../core/Heading";
import { PlainInput } from "../core/PlainInput";
import { Select } from "../core/Select";
import { Separator } from "../core/Separator";
import { HStack, VStack } from "../core/Stacks";

function enabledProxy(proxy: YakuProxySetting | null): Extract<YakuProxySetting, { type: "enabled" }> {
  return proxy?.type === "enabled"
    ? proxy
    : {
        type: "enabled",
        http: "",
        https: "",
        auth: null,
        bypass: "",
        disabled: false,
      };
}

export function SettingsProxy() {
  const settings = useYakuSettings();
  const updateSettings = useUpdateYakuSettings();
  const t = useTranslate();
  const proxy = settings.proxy;
  const activeProxy = enabledProxy(proxy);

  const updateProxy = (nextProxy: YakuProxySetting | null) => {
    updateSettings.mutate({ proxy: nextProxy });
  };

  const patchEnabledProxy = (patch: Partial<Extract<YakuProxySetting, { type: "enabled" }>>) => {
    updateProxy({ ...activeProxy, ...patch, type: "enabled" });
  };

  return (
    <VStack space={1.5} className="mb-4">
      <div className="mb-3">
        <Heading>{t("settings.proxy")}</Heading>
        <p className="text-text-subtle">{t("settings.proxy.description")}</p>
      </div>
      <Select
        name="proxy"
        label={t("settings.proxy")}
        hideLabel
        size="sm"
        value={proxy?.type ?? "automatic"}
        onChange={(value) => {
          if (value === "automatic") {
            updateProxy(null);
          } else if (value === "enabled") {
            updateProxy(activeProxy);
          } else {
            updateProxy({ type: "disabled" });
          }
        }}
        options={[
          { label: t("settings.proxy.automatic"), value: "automatic" },
          { label: t("settings.proxy.custom"), value: "enabled" },
          { label: t("settings.proxy.disabled"), value: "disabled" },
        ]}
      />
      {proxy?.type === "enabled" && (
        <VStack space={1.5}>
          <Checkbox
            className="my-3"
            checked={!activeProxy.disabled}
            title={t("settings.proxy.enable")}
            help={t("settings.proxy.enableHelp")}
            onChange={(enabled) => patchEnabledProxy({ disabled: !enabled })}
          />
          <HStack space={1.5}>
            <PlainInput
              size="sm"
              label={t("settings.proxy.httpTraffic")}
              placeholder="localhost:9090"
              defaultValue={activeProxy.http}
              onChange={(http) => patchEnabledProxy({ http })}
            />
            <PlainInput
              size="sm"
              label={t("settings.proxy.httpsTraffic")}
              placeholder="localhost:9090"
              defaultValue={activeProxy.https}
              onChange={(https) => patchEnabledProxy({ https })}
            />
          </HStack>
          <Separator className="my-6" />
          <Checkbox
            checked={activeProxy.auth != null}
            title={t("settings.proxy.enableAuth")}
            onChange={(enabled) =>
              patchEnabledProxy({ auth: enabled ? { user: "", password: "" } : null })
            }
          />

          {activeProxy.auth != null && (
            <HStack space={1.5}>
              <PlainInput
                required
                size="sm"
                label={t("settings.proxy.user")}
                placeholder="myUser"
                defaultValue={activeProxy.auth.user}
                onChange={(user) =>
                  patchEnabledProxy({
                    auth: { user, password: activeProxy.auth?.password ?? "" },
                  })
                }
              />
              <PlainInput
                size="sm"
                label={t("settings.proxy.password")}
                type="password"
                placeholder="s3cretPassw0rd"
                defaultValue={activeProxy.auth.password}
                onChange={(password) =>
                  patchEnabledProxy({
                    auth: { user: activeProxy.auth?.user ?? "", password },
                  })
                }
              />
            </HStack>
          )}
          <Separator className="my-6" />
          <PlainInput
            label={t("settings.proxy.bypass")}
            help={t("settings.proxy.bypassHelp")}
            defaultValue={activeProxy.bypass}
            placeholder={t("settings.proxy.bypassPlaceholder")}
            onChange={(bypass) => patchEnabledProxy({ bypass })}
          />
        </VStack>
      )}
    </VStack>
  );
}
