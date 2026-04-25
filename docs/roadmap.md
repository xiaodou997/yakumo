# Yakumo API Roadmap

This is the single planning document for the current Yakumo API phase.

## Current Scope

- Keep the desktop app as the primary distribution path.
- Keep `yaku` as a source-built local CLI for AI-friendly automation.
- Keep JavaScript plugins, npm CLI publishing, plugin API publishing, Flatpak, sponsors, and old Yaak release automation out of the repository.
- Preserve MIT license and original Yaak attribution.

## Quality Gates

- `bun run typecheck`
- `bun run lint`
- `bun run build`
- `bun run test`
- `cargo check --locked --workspace --all-targets`

## Active Work

- Keep frontend Tauri invoke calls aligned with registered Rust commands.
- Finish built-in importers for Postman, Insomnia, OpenAPI 3, and Swagger 2.
- Finish JSONPath and XPath response filters.
- Expand built-in template functions where `FEATURES.md` still marks gaps.
- Continue reducing Tauri capabilities to the minimum required permissions.
- Keep internal Rust crates under `crates/yakumo-*` and TypeScript workspace packages under `@yakumo-*`.

## Release Policy

- App releases use `v*` tags and `.github/workflows/release-app.yml`.
- Do not create, delete, retag, commit, or push without explicit approval.
- The `yaku` CLI is source-built only in this phase and is not published to npm.
- Release candidates must pass the quality gates above before tagging.
