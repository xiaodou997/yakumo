# Yakumo dependency and Rust refactor roadmap

This document tracks the dependency upgrade and larger Rust-first refactor plan for Yakumo.

## Current round

Status: first pass implemented.

Completed in this round:

- Removed the vendored `protoc` runtime path and replaced local `.proto` compilation with `protox`.
- Upgraded the gRPC/protobuf stack to one modern dependency generation:
  - `protox 0.9.1`
  - `prost 0.14.3`
  - `prost-types 0.14.3`
  - `prost-reflect 0.16.3`
  - `tonic 0.14.5`
  - `tonic-reflection 0.14.5`
- Updated `Cargo.lock` to the newest versions allowed by the current manifests.
- Upgraded the first batch of Rust workspace dependencies, including Tauri 2, Tokio, Rustls, Reqwest, Serde JSON, and thiserror.
- Upgraded the first batch of frontend dependencies, including Tauri JS APIs/plugins, React 19 types, TanStack Query/Router, CodeMirror, Motion, Nano ID, and Vite-related tooling.
- Refreshed `bun.lock` with the current Bun workspace constraints and pinned CodeMirror core packages through root overrides to avoid duplicate private types.
- Moved XML formatting from frontend `vkbeautify` into Rust command `cmd_format_xml`, then removed the frontend runtime dependency.
- Added a separate Rust `cmd_format_html` command boundary so HTML formatting no longer depends on the XML command name in frontend code.
- Unified Yakumo's direct HTTP client dependency on `reqwest 0.13.2`; the workspace no longer carries both `reqwest 0.12` and `reqwest 0.13`.
- Removed frontend plugin refresh hooks from built-in action/template-function query keys and deleted unused plugin-management hooks.
- Removed backend `Plugin` / `PluginKeyValue` runtime models, query modules, generated bindings, and legacy database migrations.
- Tightened the default Tauri capability by removing frontend fs and shell permissions, deduplicating clipboard grants, and dropping unused opener path access.
- Replaced frontend fs reads with narrower Rust commands for response bodies and sync-directory empty checks; response body commands now resolve paths from database `responseId` instead of trusting frontend paths.
- Added a shared Tauri path guard for import/export/save/sync/git commands and rejected absolute or parent-traversing Git relative paths.
- Split file and response-body commands out of `src-tauri/src/lib.rs` into `src-tauri/src/file_commands.rs`.
- Bound normal sync calculate/apply/watch commands to `WorkspaceMeta.settingSyncDir` via `workspaceId`; only the user-selected "open workspace from directory" bootstrap path still passes an explicit directory.
- Bound normal Git operations to `WorkspaceMeta.settingSyncDir` via `workspaceId` and removed the old direct-directory Git commands from the Tauri invoke surface. Only clone and credential setup still use explicit user-selected inputs.
- Deleted the unregistered direct-directory Git command functions so the Rust command module matches the tightened invoke surface.
- Split app metadata commands and template rendering commands out of `src-tauri/src/lib.rs` into focused Tauri command modules.

Validation completed in this round:

- `cargo check --locked --workspace --all-targets`
- `cargo test --locked -p yakumo-grpc`
- `cargo test --locked -p yakumo-app formatting`
- `cargo test --locked -p yakumo-http`
- `cargo test --locked -p yaku-cli request`
- `bun install --frozen-lockfile`
- `bun run typecheck`
- `bun run lint`
- `bun run build`
- `cargo fmt --all --check`
- `git diff --check`

Known non-blocking warnings:

- `bun run build` reports large frontend chunks, especially editor extensions. This should be handled by route-level or editor-language code splitting.
- `bun run build` reports a PostCSS plugin warning about a missing `from` option. This is currently non-fatal and likely tied to the existing Tailwind/PostCSS stack.
- `reqwest 0.13` uses the renamed `rustls-no-provider` feature, replacing the old `rustls-tls-manual-roots-no-provider` feature.

## Upgrade policy

Yakumo is a new project, so we do not need to preserve old Yaak dependency APIs when they block a cleaner design. We should still avoid unrelated major upgrades in the same patch because the failure boundary becomes unclear.

Use this sequence:

1. Upgrade lockfiles within current semver constraints.
2. Upgrade one major dependency family at a time.
3. Move non-UI domain work to Rust before removing frontend libraries.
4. Run the quality gate after every family upgrade.

Quality gate:

- `cargo check --locked --workspace --all-targets`
- `cargo test --locked -p yakumo-grpc`
- `bun run typecheck`
- `bun run build`
- `cargo fmt --all --check`
- `git diff --check`

## Major Rust upgrades still pending

These were reported as newer major versions but should be migrated separately:

- `rusqlite 0.39` / `r2d2_sqlite 0.33`: high impact because it touches the database layer and model store.
- `schemars 1.x`: medium impact because CLI schemas and generated agent hints depend on schema shape stability.
- `ts-rs 12.x`: medium impact because it affects generated TypeScript bindings.
- `tokio-tungstenite 0.29`: medium impact, should be done together for WebSocket desktop and CLI behavior.
- `rustls-platform-verifier 0.7`: medium impact, should be checked with custom certificate/proxy behavior.
- `inquire 0.9` and `console 0.16`: low to medium impact, CLI only.
- `jsonwebtoken 10`, `hmac 0.13`, `sha1 0.11`, `sha2 0.11`, `md-5 0.11`: auth/hash behavior must be regression-tested before migration.

## Major frontend upgrades still pending

These should be split by risk:

- TanStack Router and Router Plugin latest: do together and verify generated routes.
- Tauri JS plugins latest: do together with Rust Tauri plugin versions.
- Tailwind 4: large styling/build migration, not a lockfile-only upgrade.
- Lucide React 1.x: verify icon names and bundle impact.
- `codemirror-json-schema 0.8`: verify editor diagnostics and schema completions.
- `@prantlf/jsonlint 17`: ideally remove after moving JSON validation/formatting fully to Rust.
- `focus-trap-react 12`: verify dialogs, command palette, and nested modal behavior.
- `vite-plugin-static-copy 4` and `vite-plugin-svgr 5`: build config migration only.
- `whatwg-mimetype 5`: verify response content-type parsing before upgrading.

## Rust-first refactor candidates

Move these out of the frontend first:

- HTML formatting: XML formatting has moved to Rust; add a Rust `cmd_format_html` command next and remove any remaining browser-only pretty-printing logic.
- GraphQL introspection and schema handling: request sending is already Rust-backed; move introspection query execution and schema normalization into Rust so the frontend only renders editor state.
- JSON validation and lint messages: JSON formatting already calls Rust first; migrate validation errors out of `@prantlf/jsonlint` when editor diagnostics are redesigned.
- Response body filtering and large-body reads: keep and expand Rust ownership to avoid loading large responses through frontend memory.
- Importers: keep expanding `yakumo-features` importers for Postman, Insomnia, OpenAPI 3, and Swagger 2 so dialogs only display real Rust-backed formats.
- Auth config refresh keys: remove frontend `js-md5` hashing by exposing a Rust-backed auth state revision or response-close counter.
- Public action/template/auth payloads now use `sourceId` for built-in registries instead of plugin compatibility fields.

Do not move these to Rust:

- Editor state, cursor behavior, keyboard shortcuts, route state, layout measurements, and local UI-only preferences.
- Dialog composition and visual interactions.

## Recommended next implementation order

1. Continue splitting large Tauri commands out of `src-tauri/src/lib.rs` into domain command modules.
2. Split the remaining large Tauri command groups out of `src-tauri/src/lib.rs`, starting with gRPC send/reflection and HTTP send commands.
3. Upgrade Tauri Rust and JS plugin manifests explicitly to the versions already proven by the lockfile update.
4. Upgrade TanStack Router family and regenerate routes.
5. Plan Tailwind 4 as a dedicated UI/build migration.
