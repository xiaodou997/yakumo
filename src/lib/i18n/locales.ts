export const supportedLanguages = ["en", "zh-CN"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];
export type LanguagePreference = "system" | SupportedLanguage;

export const languageOptions: { label: string; value: LanguagePreference }[] = [
  { label: "System default", value: "system" },
  { label: "English", value: "en" },
  { label: "简体中文", value: "zh-CN" },
];

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return supportedLanguages.includes(value as SupportedLanguage);
}
