import type { LanguageSupport } from "@codemirror/language";
import { LRLanguage } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { parseMixed } from "@lezer/common";
import type { LRParser } from "@lezer/lr";
import type { WrappedEnvironmentVariable } from "../../../../hooks/useEnvironmentVariables";
import type { GenericCompletionConfig } from "../genericCompletion";
import { genericCompletion } from "../genericCompletion";
import type { TwigCompletionOption } from "./completion";
import { twigCompletion } from "./completion";
import { templateTagsPlugin } from "./templateTags";

var mixedLanguagesCache: Record<string, LRLanguage> | undefined;

export function twig({
  base,
  twigParser,
  environmentVariables,
  completionOptions,
  autocomplete,
  onClickVariable,
  onClickMissingVariable,
  extraExtensions,
}: {
  base: LanguageSupport;
  twigParser: LRParser;
  environmentVariables: WrappedEnvironmentVariable[];
  completionOptions: TwigCompletionOption[];
  autocomplete?: GenericCompletionConfig;
  onClickVariable: (option: WrappedEnvironmentVariable, tagValue: string, startPos: number) => void;
  onClickMissingVariable: (name: string, tagValue: string, startPos: number) => void;
  onClickPathParameter: (name: string) => void;
  extraExtensions: Extension[];
}) {
  const language = mixLanguage(base, twigParser);

  const variableOptions: TwigCompletionOption[] =
    environmentVariables.map((v) => ({
      name: v.variable.name,
      value: v.variable.value,
      type: "variable",
      label: v.variable.name,
      description: `Inherited from ${v.source}`,
      onClick: (rawTag: string, startPos: number) => onClickVariable(v, rawTag, startPos),
    })) ?? [];

  const options = [...variableOptions, ...completionOptions];
  const completions = twigCompletion({ options });

  return [
    language,
    base.support,
    language.data.of({ autocomplete: completions }),
    base.language.data.of({ autocomplete: completions }),
    language.data.of({ autocomplete: genericCompletion(autocomplete) }),
    base.language.data.of({ autocomplete: genericCompletion(autocomplete) }),
    templateTagsPlugin(options, onClickMissingVariable),
    ...extraExtensions,
  ];
}

function mixLanguage(base: LanguageSupport, twigParser: LRParser): LRLanguage {
  // It can be slow to mix languages when there are hundreds of editors, so we'll cache them to speed it up
  const cache = (mixedLanguagesCache ??= {});
  const cached = cache[base.language.name];
  if (cached != null) {
    return cached;
  }

  const parser = twigParser.configure({
    wrap: parseMixed((node) => {
      // If the base language is text, we can overwrite at the top
      if (base.language.name !== "text" && !node.type.isTop) {
        return null;
      }

      return {
        parser: base.language.parser,
        overlay: (node) => node.type.name === "Text",
      };
    }),
  });

  const language = LRLanguage.define({ name: "twig", parser });
  cache[base.language.name] = language;
  return language;
}
