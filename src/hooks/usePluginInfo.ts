// Plugin info is no longer supported in Yakumo API
// All functionality is now built-in

import type { PluginMetadata } from "@yakumo/features";

export function usePluginInfo(_id: string | null) {
  // Return null since plugins are no longer supported
  return {
    data: null as PluginMetadata | null,
    isLoading: false,
    error: null,
  };
}

export function invalidateAllPluginInfo() {
  // No-op since plugins are no longer supported
}