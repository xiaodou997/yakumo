#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginsDir = path.join(rootDir, "plugins");
const externalPluginsDir = path.join(rootDir, "plugins-external");

const externalPlugins = existsSync(externalPluginsDir)
  ? new Set(readdirSync(externalPluginsDir).filter((name) => !name.startsWith(".")))
  : new Set();

const pluginNames = readdirSync(pluginsDir)
  .filter((name) => !name.startsWith(".") && !externalPlugins.has(name))
  .sort((left, right) => {
    const priority = new Map([
      ["template-function-json", 0],
      ["template-function-xml", 1],
      ["template-function-request", 2],
      ["template-function-response", 3],
    ]);
    return (priority.get(left) ?? 10) - (priority.get(right) ?? 10) || left.localeCompare(right);
  });

for (const name of pluginNames) {
  const cwd = path.join(pluginsDir, name);
  const packagePath = path.join(cwd, "package.json");
  if (!existsSync(packagePath)) continue;

  console.log(`Building ${name}...`);
  const result = spawnSync("bun", ["run", "build"], {
    cwd,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
