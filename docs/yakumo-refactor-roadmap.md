# Yakumo API Refactor Roadmap

This document is the working entry point for the Yakumo API refactor.

## Phase 1 Scope

- Keep the desktop app.
- Keep the local source-built AI CLI named `yaku`.
- Remove the JavaScript plugin compatibility layer from the product surface.
- Keep npm CLI publishing, plugin API npm publishing, Flatpak, sponsors, and old Yaak release flows out of the repository unless a later phase explicitly reopens that scope.
- Do not commit, push, or tag without explicit approval.

## Current Quality Gates

- `bun run typecheck`
- `bun run lint`
- `bun run build`
- `cargo check --locked --workspace --all-targets`

## Active Technical Priorities

- Keep frontend `invokeCmd` calls aligned with registered Tauri commands.
- Keep built-in registries for auth, template functions, actions, themes, and importers.
- Keep `cmd_secure_template`, `cmd_decrypt_template`, and `secure()` rendering backed by `yaak_crypto::EncryptionManager`.
- Use `YAKUMO_DEV_PORT` consistently for desktop development.
- Keep Tauri capabilities under review and remove broad permissions when replacement flows are ready.

## Deferred Work

- Rename internal Rust crates from `yaak-*` to `yakumo-*`.
- Keep generated feature bindings under `@yakumo/features` and continue removing legacy plugin terminology from call sites.
- Implement Postman, Insomnia, OpenAPI 3, Swagger 2 importers.
- Implement JSONPath/XPath response filters.
- Rebuild release workflows for Yakumo app tags only.
