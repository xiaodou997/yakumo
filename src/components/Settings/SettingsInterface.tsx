import { type } from "@tauri-apps/plugin-os";
import { useFonts } from "@yaakapp-internal/fonts";
import type { EditorKeymap, Settings } from "@yaakapp-internal/models";
import { patchModel, settingsAtom } from "@yaakapp-internal/models";
import { useAtomValue } from "jotai";
import { useState } from "react";

import { activeWorkspaceAtom } from "../../hooks/useActiveWorkspace";
import { clamp } from "../../lib/clamp";
import { useTranslate } from "../../lib/i18n";
import { languageOptions } from "../../lib/i18n/locales";
import { invokeCmd } from "../../lib/tauri";
import { Button } from "../core/Button";
import { Checkbox } from "../core/Checkbox";
import { Heading } from "../core/Heading";
import { Icon } from "../core/Icon";
import { Select } from "../core/Select";
import { HStack, VStack } from "../core/Stacks";

const NULL_FONT_VALUE = "__NULL_FONT__";

const fontSizeOptions = [
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
  28, 29, 30,
].map((n) => ({ label: `${n}`, value: `${n}` }));

const keymaps: { value: EditorKeymap; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "vim", label: "Vim" },
  { value: "vscode", label: "VSCode" },
  { value: "emacs", label: "Emacs" },
];

export function SettingsInterface() {
  const t = useTranslate();
  const workspace = useAtomValue(activeWorkspaceAtom);
  const settings = useAtomValue(settingsAtom);
  const fonts = useFonts();

  if (settings == null || workspace == null) {
    return null;
  }

  return (
    <VStack space={3} className="mb-4">
      <div className="mb-3">
        <Heading>{t("settings.interface.heading")}</Heading>
        <p className="text-text-subtle">{t("settings.interface.subtitle")}</p>
      </div>
      <Select
        leftSlot={<Icon icon="palette" color="secondary" />}
        name="appearance"
        label={t("settings.theme.appearance")}
        size="sm"
        value={settings.appearance}
        onChange={(appearance) => patchModel(settings, { appearance })}
        options={[
          { label: t("settings.theme.appearance.automatic"), value: "system" },
          { label: t("settings.theme.appearance.light"), value: "light" },
          { label: t("settings.theme.appearance.dark"), value: "dark" },
        ]}
      />
      <Select
        leftSlot={<Icon icon="globe" color="secondary" />}
        name="language"
        label={t("settings.interface.language")}
        size="sm"
        help={t("settings.interface.languageHelp")}
        value={settings.language || "system"}
        options={languageOptions.map((option) => ({
          ...option,
          label:
            option.value === "system"
              ? t("common.systemDefault")
              : option.label,
        }))}
        onChange={(language) => patchModel(settings, { language })}
      />
      <Select
        name="switchWorkspaceBehavior"
        label={t("settings.interface.openWorkspaceBehavior")}
        size="sm"
        help={t("settings.interface.openWorkspaceBehaviorHelp")}
        value={
          settings.openWorkspaceNewWindow === true
            ? "new"
            : settings.openWorkspaceNewWindow === false
              ? "current"
              : "ask"
        }
        onChange={async (v) => {
          if (v === "current")
            await patchModel(settings, { openWorkspaceNewWindow: false });
          else if (v === "new")
            await patchModel(settings, { openWorkspaceNewWindow: true });
          else await patchModel(settings, { openWorkspaceNewWindow: null });
        }}
        options={[
          { label: t("settings.interface.optionAlwaysAsk"), value: "ask" },
          {
            label: t("settings.interface.optionCurrentWindow"),
            value: "current",
          },
          { label: t("settings.interface.optionNewWindow"), value: "new" },
        ]}
      />
      <HStack space={2} alignItems="end">
        {fonts.data && (
          <Select
            size="sm"
            name="uiFont"
            label={t("settings.interface.interfaceFont")}
            value={settings.interfaceFont ?? NULL_FONT_VALUE}
            options={[
              { label: t("common.systemDefault"), value: NULL_FONT_VALUE },
              ...(fonts.data.uiFonts.map((f) => ({
                label: f,
                value: f,
              })) ?? []),
              // Some people like monospace fonts for the UI
              ...(fonts.data.editorFonts.map((f) => ({
                label: f,
                value: f,
              })) ?? []),
            ]}
            onChange={async (v) => {
              const interfaceFont = v === NULL_FONT_VALUE ? null : v;
              await patchModel(settings, { interfaceFont });
            }}
          />
        )}
        <Select
          hideLabel
          size="sm"
          name="interfaceFontSize"
          label={t("settings.interface.interfaceFontSize")}
          defaultValue="14"
          value={`${settings.interfaceFontSize}`}
          options={fontSizeOptions}
          onChange={(v) =>
            patchModel(settings, { interfaceFontSize: Number.parseInt(v, 10) })
          }
        />
      </HStack>
      <HStack space={2} alignItems="end">
        {fonts.data && (
          <Select
            size="sm"
            name="editorFont"
            label={t("settings.interface.editorFont")}
            value={settings.editorFont ?? NULL_FONT_VALUE}
            options={[
              { label: t("common.systemDefault"), value: NULL_FONT_VALUE },
              ...(fonts.data.editorFonts.map((f) => ({
                label: f,
                value: f,
              })) ?? []),
            ]}
            onChange={async (v) => {
              const editorFont = v === NULL_FONT_VALUE ? null : v;
              await patchModel(settings, { editorFont });
            }}
          />
        )}
        <Select
          hideLabel
          size="sm"
          name="editorFontSize"
          label={t("settings.interface.editorFontSize")}
          defaultValue="12"
          value={`${settings.editorFontSize}`}
          options={fontSizeOptions}
          onChange={(v) =>
            patchModel(settings, {
              editorFontSize: clamp(Number.parseInt(v, 10) || 14, 8, 30),
            })
          }
        />
      </HStack>
      <Select
        leftSlot={<Icon icon="keyboard" color="secondary" />}
        size="sm"
        name="editorKeymap"
        label={t("settings.interface.editorKeymap")}
        value={`${settings.editorKeymap}`}
        options={keymaps}
        onChange={(v) => patchModel(settings, { editorKeymap: v })}
      />
      <Checkbox
        checked={settings.editorSoftWrap}
        title={t("settings.interface.wrapEditorLines")}
        onChange={(editorSoftWrap) => patchModel(settings, { editorSoftWrap })}
      />
      <Checkbox
        checked={settings.coloredMethods}
        title={t("settings.interface.colorizeMethods")}
        onChange={(coloredMethods) => patchModel(settings, { coloredMethods })}
      />

      <NativeTitlebarSetting settings={settings} />

      {type() !== "macos" && (
        <Checkbox
          checked={settings.hideWindowControls}
          title={t("settings.interface.hideWindowControls")}
          help={t("settings.interface.hideWindowControlsHelp")}
          onChange={(hideWindowControls) =>
            patchModel(settings, { hideWindowControls })
          }
        />
      )}
    </VStack>
  );
}

function NativeTitlebarSetting({ settings }: { settings: Settings }) {
  const t = useTranslate();
  const [nativeTitlebar, setNativeTitlebar] = useState(
    settings.useNativeTitlebar,
  );
  return (
    <div className="flex gap-1 overflow-hidden h-2xs">
      <Checkbox
        checked={nativeTitlebar}
        title={t("settings.interface.nativeTitleBar")}
        help={t("settings.interface.nativeTitleBarHelp")}
        onChange={setNativeTitlebar}
      />
      {settings.useNativeTitlebar !== nativeTitlebar && (
        <Button
          color="primary"
          size="2xs"
          onClick={async () => {
            await patchModel(settings, { useNativeTitlebar: nativeTitlebar });
            await invokeCmd("cmd_restart");
          }}
        >
          {t("settings.applyAndRestart")}
        </Button>
      )}
    </div>
  );
}