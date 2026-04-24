#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nodeBinary = process.platform === "win32" ? "yaaknode.exe" : "yaaknode";

const checks = [
  {
    name: "Protocol Buffers includes",
    path: "crates-tauri/yaak-app/vendored/protoc/include",
    command: ["bun", "run", "vendor:vendor-protoc"],
  },
  {
    name: "plugin runtime",
    path: "crates-tauri/yaak-app/vendored/plugin-runtime/index.cjs",
    command: ["bun", "run", "--cwd", "packages/plugin-runtime", "build"],
  },
  {
    name: "bundled plugins",
    path: "crates-tauri/yaak-app/vendored/plugins",
    command: ["bun", "run", "bootstrap:vendor-plugins"],
  },
  {
    name: "vendored Node runtime",
    path: `crates-tauri/yaak-app/vendored/node/${nodeBinary}`,
    command: ["bun", "run", "vendor:vendor-node"],
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
