# Yakumo API Release Policy

This repository currently keeps only the desktop app release path.

## Active Tags

| Release type | Tag format | Workflow | Example |
| --- | --- | --- | --- |
| Desktop app | `v*` | `release-app.yml` | `v1.0.0` |

## Removed Release Paths

- npm CLI publishing was removed. The `yaku` CLI remains source-built from `crates-cli/yaak-cli`.
- Plugin API npm publishing was removed with the JavaScript plugin compatibility layer.
- Flatpak and sponsors automation were removed.

## Rules

1. Do not create, delete, or retag without explicit approval.
2. Do not reuse released tags.
3. Run the quality gates before releasing: `bun run typecheck`, `bun run lint`, `bun run build`, and `cargo check --locked --workspace --all-targets`.
4. Use SemVer-compatible app versions.

## Active Files

- `.github/workflows/release-app.yml`
- `src-tauri/tauri.release.conf.json`
