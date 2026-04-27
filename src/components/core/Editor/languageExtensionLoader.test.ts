import type { Extension, StateEffect } from "@codemirror/state";
import { describe, expect, test, vi } from "vitest";
import type { LanguageExtensionConfig } from "./languageExtensions";
import { createLanguageExtensionConfigurator } from "./languageExtensionLoader";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const config = { language: "text" } as LanguageExtensionConfig;
const extension = (name: string) => [name] as unknown as Extension;
const effect = (name: string) => ({ name }) as unknown as StateEffect<unknown>;

describe("createLanguageExtensionConfigurator", () => {
  test("does not let an older async language load overwrite a newer one", async () => {
    const first = deferred<Extension>();
    const second = deferred<Extension>();
    const secondEffect = effect("second");
    const dispatch = vi.fn();
    const reconfigure = vi.fn(() => secondEffect);
    const target = { view: { dispatch }, languageCompartment: { reconfigure } };
    const getLanguageExtension = vi
      .fn<(config: LanguageExtensionConfig) => Promise<Extension>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const configure = createLanguageExtensionConfigurator({
      getCurrent: () => target,
      loadLanguageExtensions: async () => ({ getLanguageExtension }),
    });

    const firstConfigure = configure(config);
    await Promise.resolve();

    const secondConfigure = configure(config);
    await Promise.resolve();

    second.resolve(extension("second"));
    await secondConfigure;

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenLastCalledWith({ effects: secondEffect });

    first.resolve(extension("first"));
    await firstConfigure;

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(reconfigure).toHaveBeenCalledTimes(1);
  });

  test("drops a loaded extension if the editor instance changed", async () => {
    const pending = deferred<Extension>();
    const oldTarget = {
      view: { dispatch: vi.fn() },
      languageCompartment: { reconfigure: vi.fn(() => effect("old")) },
    };
    const newTarget = {
      view: { dispatch: vi.fn() },
      languageCompartment: { reconfigure: vi.fn(() => effect("new")) },
    };
    let current = oldTarget;
    const configure = createLanguageExtensionConfigurator({
      getCurrent: () => current,
      loadLanguageExtensions: async () => ({
        getLanguageExtension: async () => pending.promise,
      }),
    });

    const configurePromise = configure(config);
    current = newTarget;
    pending.resolve(extension("stale"));
    await configurePromise;

    expect(oldTarget.view.dispatch).not.toHaveBeenCalled();
    expect(newTarget.view.dispatch).not.toHaveBeenCalled();
  });
});
