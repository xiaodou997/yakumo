// Types exported from generated bindings
export * from "./bindings/gen_models";
export * from "./bindings/gen_events";
export * from "./bindings/gen_search";

// Plugin management functions are no longer supported in Yakumo API
// All authentication and template functions are now built-in

export async function searchPlugins(_query: string) {
  console.warn("Plugin search is no longer supported");
  return { plugins: [] };
}

export async function installPlugin(_name: string, _version: string | null) {
  console.warn("Plugin installation is no longer supported");
}

export async function uninstallPlugin(_pluginId: string) {
  console.warn("Plugin uninstallation is no longer supported");
}

export async function checkPluginUpdates() {
  console.warn("Plugin updates are no longer supported");
  return { updates: [] };
}

export async function updateAllPlugins() {
  console.warn("Plugin updates are no longer supported");
  return [];
}

export async function installPluginFromDirectory(_directory: string) {
  console.warn("Plugin installation from directory is no longer supported");
}