import { settingsAtom } from "@yaakapp-internal/models";
import { useAtomValue } from "jotai";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import {
  isSupportedLanguage,
  type LanguagePreference,
  type SupportedLanguage,
} from "./locales";
import { messages, type MessageKey } from "./messages";
import { jotaiStore } from "../jotai";

type Translate = (
  key: MessageKey,
  values?: Record<string, string | number>,
) => string;

type I18nValue = {
  language: SupportedLanguage;
  preference: LanguagePreference;
  t: Translate;
};

const I18nContext = createContext<I18nValue>({
  language: "en",
  preference: "system",
  t: (key, values) => interpolate(messages.en[key], values),
});

function interpolate(
  message: string,
  values?: Record<string, string | number>,
): string {
  if (values == null) {
    return message;
  }
  return message.replace(
    /\{(\w+)\}/g,
    (_, key: string) => `${values[key] ?? `{${key}}`}`,
  );
}

function getSystemLanguage(): SupportedLanguage {
  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const language of languages) {
    if (language === "zh-CN" || language.toLowerCase().startsWith("zh-cn")) {
      return "zh-CN";
    }
    if (language.toLowerCase().startsWith("zh")) {
      return "zh-CN";
    }
    if (language.toLowerCase().startsWith("en")) {
      return "en";
    }
  }
  return "en";
}

function resolveLanguage(preference: string | undefined): SupportedLanguage {
  if (
    preference &&
    preference !== "system" &&
    isSupportedLanguage(preference)
  ) {
    return preference;
  }
  return getSystemLanguage();
}

function resolvePreference(preference: string | undefined): LanguagePreference {
  if (
    preference === "system" ||
    (preference && isSupportedLanguage(preference))
  ) {
    return preference;
  }
  return "system";
}

function currentLanguage(): SupportedLanguage {
  const settings = jotaiStore.get(settingsAtom);
  return resolveLanguage(resolvePreference(settings?.language));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const settings = useAtomValue(settingsAtom);
  const preference = resolvePreference(settings?.language);
  const language = resolveLanguage(preference);

  const value = useMemo<I18nValue>(() => {
    const localeMessages = messages[language];
    return {
      language,
      preference,
      t: (key, values) =>
        interpolate(localeMessages[key] ?? messages.en[key], values),
    };
  }, [language, preference]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useTranslate() {
  return useI18n().t;
}

export function translate(
  key: MessageKey,
  values?: Record<string, string | number>,
) {
  const language = currentLanguage();
  return interpolate(messages[language][key] ?? messages.en[key], values);
}

export function translateCount(
  key: MessageKey,
  count: number,
  opt: { omitSingle?: boolean; noneWord?: string } = {},
): string {
  if (opt.noneWord && count === 0) {
    return opt.noneWord;
  }

  const label = translate(key);
  if (currentLanguage() === "zh-CN") {
    if (opt.omitSingle && count === 1) {
      return label;
    }
    return `${count} 个${label}`;
  }

  if (opt.omitSingle && count === 1) {
    return label;
  }
  return `${count} ${count === 1 ? label : `${label}s`}`;
}
