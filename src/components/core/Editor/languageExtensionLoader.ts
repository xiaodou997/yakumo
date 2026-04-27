import type { Extension, StateEffect } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { LanguageExtensionConfig } from "./languageExtensions";

interface LanguageExtensionTarget {
  view: Pick<EditorView, "dispatch">;
  languageCompartment: {
    reconfigure: (extension: Extension) => StateEffect<unknown>;
  };
}

interface Options {
  getCurrent: () => LanguageExtensionTarget | null;
  loadLanguageExtensions: () => Promise<{
    getLanguageExtension: (config: LanguageExtensionConfig) => Promise<Extension>;
  }>;
}

export function createLanguageExtensionConfigurator({
  getCurrent,
  loadLanguageExtensions,
}: Options) {
  let loadId = 0;

  return async (config: LanguageExtensionConfig) => {
    const current = getCurrent();
    if (current === null) return;

    const currentLoadId = ++loadId;
    const { getLanguageExtension } = await loadLanguageExtensions();
    if (currentLoadId !== loadId || getCurrent() !== current) return;

    const extension = await getLanguageExtension(config);
    if (currentLoadId !== loadId || getCurrent() !== current) return;

    current.view.dispatch({
      effects: current.languageCompartment.reconfigure(extension),
    });
  };
}
