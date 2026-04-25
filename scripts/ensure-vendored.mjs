#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const checks = [
  {
    name: "Protocol Buffers includes",
    path: "src-tauri/vendored/protoc/include",
    command: ["bun", "run", "vendor:vendor-protoc"],
  },
];

for (const check of checks) {
  const absolutePath = path.join(rootDir, check.path);
  if (existsSync(absolutePath)) {
    console.log(`✓ ${check.name} already present`);
    continue;
  }

  console.log(`Preparing missing ${check.name}...`);
  const [command, ...args] = check.command;
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}