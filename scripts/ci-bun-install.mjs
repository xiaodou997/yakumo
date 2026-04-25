import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const attempts = Number.parseInt(process.env.BUN_INSTALL_ATTEMPTS ?? "4", 10);
const cacheDir =
  process.env.BUN_INSTALL_CACHE_DIR ?? join(homedir(), ".bun", "install", "cache");
const networkConcurrency = process.env.BUN_NETWORK_CONCURRENCY ?? "4";
const registry = process.env.BUN_REGISTRY ?? "https://registry.npmjs.org";

const args = [
  "install",
  "--frozen-lockfile",
  "--network-concurrency",
  networkConcurrency,
  "--registry",
  registry,
  "--cache-dir",
  cacheDir,
];

let lastStatus = 1;

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  console.log(`bun install attempt ${attempt}/${attempts}`);

  const result = spawnSync("bun", args, {
    env: process.env,
    stdio: "inherit",
  });

  lastStatus = result.status ?? 1;
  if (lastStatus === 0) {
    process.exit(0);
  }

  if (attempt < attempts) {
    const delayMs = attempt * 5_000;
    console.log(`bun install failed, retrying in ${delayMs / 1000}s...`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
  }
}

process.exit(lastStatus);
