// Plugin management is no longer supported in Yakumo API
// All functionality is now built-in

import { useAtomValue } from "jotai";
import { pluginsAtom } from "@yakumo-internal/models";
import { useDebouncedValue } from "./useDebouncedValue";

export function usePluginsKey() {
  // Return empty key since plugins are no longer supported
  const plugins = useAtomValue(pluginsAtom);
  const pluginKey = plugins
    .map((p) => p.id + p.updatedAt)
    .join(",");

  // Debounce for efficiency
  return useDebouncedValue(pluginKey, 1000);
}

/**
 * Reload plugins - now a no-op since plugins are built-in
 */
export function useRefreshPlugins() {
  return {
    mutate: async () => {
      // No-op since plugins are no longer supported
      console.log("Plugin refresh is no longer needed - functionality is built-in");
    },
    mutateAsync: async () => {
      // No-op since plugins are no longer supported
      console.log("Plugin refresh is no longer needed - functionality is built-in");
    },
    isLoading: false,
    error: null,
  };
}