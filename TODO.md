# Yakumo API Roadmap

This fork is being independentized as a new project. The first phase keeps the current Yaak product name and package/crate identifiers so the desktop app can keep running while the build system is migrated.

For the detailed beginner-friendly implementation checklist, see `docs/yakumo-api-independentization-tasks.md`.

## Phase 1: Toolchain and Runtime Stability

- Use Bun as the primary package manager and script runner.
- Use official Vite, Vitest, and `@vitejs/plugin-react` instead of Vite+ packages.
- Keep the existing Tauri desktop app flow and current Chinese i18n work intact.
- Automatically prepare required vendored assets before desktop development starts:
  - `crates-tauri/yaak-app/vendored/protoc/include`
  - `crates-tauri/yaak-app/vendored/plugin-runtime`
  - `crates-tauri/yaak-app/vendored/plugins`
  - `crates-tauri/yaak-app/vendored/node`
- Keep the current vendored Node plugin runtime during this phase so plugins remain stable.

## Phase 2: Yakumo API Branding

- Rename visible product branding to `Yakumo API`.
- Replace Tauri `productName`, `identifier`, deep link scheme, icons, and app metadata.
- Rename CLI/package references where appropriate.
- Update README and screenshots for the independent project.
- Add a source/attribution note explaining that this project started from Yaak.

## Phase 3: Plugin Runtime Experiment

- Add a configurable JavaScript runtime abstraction on the Rust side.
- Vendor a Bun runtime as an experiment alongside the existing Node runtime.
- Validate whether `packages/plugin-runtime` CJS output runs correctly under Bun.
- Keep Node as a fallback if Bun runtime compatibility is incomplete.

## Licensing

- Keep the MIT license and existing Yaak copyright notices.
- Do not remove open-source attribution while renaming or rebranding.
