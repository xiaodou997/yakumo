# Yakumo API TODO

Yakumo API is now treated as a new project baseline. Do not reintroduce the JavaScript plugin runtime, npm CLI publishing, Flatpak release flow, or old Yaak release automation unless a later phase explicitly reopens that scope.

## Phase 1 Quality Gate

- Keep `bun run typecheck`, `bun run lint`, `bun run build`, and `cargo check --locked --workspace --all-targets` passing.
- Keep desktop app development on `YAKUMO_DEV_PORT`.
- Keep `yaku` as a source-built local CLI; do not publish npm CLI packages.
- Keep plugin compatibility code out of the runtime path.

## Product Work

- Finish built-in importers for Postman, Insomnia, OpenAPI 3, and Swagger 2.
- Finish response filters for JSONPath and XPath.
- Expand built-in template functions where `FEATURES.md` still marks gaps.
- Continue reducing Tauri capabilities to the minimum required permission set.
- Rename internal crate/package identifiers from `yaak-*` only after the app and CLI quality gates stay green.

## Documentation

- Keep [`FEATURES.md`](FEATURES.md) status labels accurate.
- Keep [`docs/yakumo-refactor-roadmap.md`](docs/yakumo-refactor-roadmap.md) as the active refactor entry point.
- Keep Yaak attribution and MIT license notices intact.
