# Yaku-First Destructive Rewrite Plan

Last updated: 2026-05-21

## Decision

The long-term product and architecture name is `Yaku`. `Yakumo V2` is now only a
transitional label for the current scaffold. The target architecture is
Yaku-first, destructive, and not constrained by historical Yaak/Yakumo data,
legacy `AnyModel` APIs, old workspace UI compatibility, or old model-store
migrations.

If legacy data import is needed later, it must be an explicit one-way importer.
The runtime architecture must not preserve compatibility layers.

## Naming Policy

### Final Naming

- Product/user-facing name: `Yaku`.
- CLI binary: `yaku`.
- New Rust crates: `yaku-domain`, `yaku-store`, `yaku-engine`.
- New frontend feature directory: `src/features/yaku-workspace`.
- New frontend client directory: `src/lib/yaku-client`.
- New Tauri commands: `cmd_yaku_*`.
- New app data files: `yaku.sqlite` and `yaku-bodies`.
- New docs should use `Yaku`, not `Yakumo V2`.

### Transitional Naming

- Existing committed `yakumo-*` crates can be renamed in staged phases, not all
  at once.
- Old `@yakumo-internal/models` code should not be mechanically renamed. It is
  scheduled for deletion.
- Existing app bundle identifier, updater identity, and release tag policy are
  not renamed until explicitly approved because they affect app data locations,
  keychain identity, release automation, and installed app behavior.
- `docs/architecture-yaku.md` is the canonical rewrite plan.

## Code Audit

### Current Yaku Assets To Keep

- `crates/yaku-domain`.
- `crates/yaku-store`.
- `crates/yaku-engine`.
- `src-tauri/src/yaku_commands.rs`.
- `src/lib/yaku-client`.
- `src/features/yaku-workspace`.
- Shared UI primitives under `src/components/core`, tree components, editor
  infrastructure, dialog/toast helpers, router, and query client.

### Current Legacy Choke Points To Remove

- `src/main.tsx` no longer calls `initModelStore(jotaiStore)` or `initSync()`.
- `src/components/StartupGate.tsx` has been removed; startup no longer calls
  `changeModelStoreWorkspace(null)`.
- Legacy workspace surface components have been removed from `src/components`:
  old `Workspace`, sidebar, request panes, response panes, GraphQL panes,
  command palette, and header/dropdown surface are no longer compiled.
- `src-tauri/src/lib.rs` now registers only current app shell commands and
  explicit `cmd_yaku_*` commands. Old request, sync, git, WebSocket, gRPC,
  import, template, action, and `models_*` commands are no longer exposed.
- `src-tauri/src/models_ext.rs` has been removed. Desktop startup, updater,
  notification dismissal, launch analytics, and titlebar configuration now use
  Yaku `settings` records instead of the legacy `db.sqlite` model store.
- `crates/yakumo-models` and the legacy helper crates that depended on it
  (`crates/yakumo-crypto`, `crates/yakumo-http`, and `crates/yakumo-ws`) have
  been removed from the workspace.
- Old umbrella/optional crates `crates/yakumo`, `crates/yakumo-features`,
  `crates/yakumo-git`, `crates/yakumo-sync`, and `crates/yakumo-license` have
  been removed from the workspace.
- Empty or isolated legacy helper crates `crates/yakumo-core` and
  `crates/yakumo-sse` have also been removed.

### Keep Versus Rewrite

Keep:

- Tauri shell, window plugins, logging, updater, deep-link infrastructure where
  still in product scope.
- Core UI primitives, tree, dropdown, buttons, split layout, editors, and
  response viewers where they can accept Yaku props without importing old
  models.
- `yakumo-templates` and built-in template functions until they are renamed or
  replaced.
- Protocol transport crates only when called through the new Yaku engine path.

Rewrite:

- Workspace shell, sidebar, request editor, run timeline, response/body panes,
  environment editor, recent state, settings, secrets, and command palette.
- Frontend state hooks. Yaku must use query-shaped state instead of global
  workspace model atoms.
- Tauri command bridge. Commands should be explicit Yaku resources and run
  lifecycle commands, not `AnyModel`.
- Settings/secrets. They should move into Yaku settings/secrets tables and typed
  commands.

Delete after replacement:

- Remaining old utility/dialog/settings components that still import
  `@yakumo-internal/models`. Current `src` no longer imports
  `@yakumo-internal/models` or `@yakumo-internal/sync`.
- `crates/yakumo-models/guest-js` usage from the app.
- `models_ext` commands from the desktop bridge.
- Old sync/import/export paths that only serialize `AnyModel`.
- Old send hooks once no non-workspace command palette/import path references
  them.

## Target Architecture

```text
React Yaku App
  src/lib/yaku-client/*
    generated Rust TS bindings
    resource-specific command wrappers
    resource-specific query hooks
    event subscription helpers
  Tauri Yaku commands + events
    yaku-domain
      domain services + typed protocol config
    yaku-store
      SQLite + body file storage
    yaku-engine
      HTTP / GraphQL / gRPC / WebSocket / SSE send runtime
  yaku CLI
    same domain/store/engine path
```

The old `AnyModel` store must not initialize on app startup once the first Yaku
workspace shell replaces `/workspaces`.

## Data Model Direction

Keep structured tables for:

- `workspaces`
- `request_nodes`
- `requests`
- `environments`
- `runs`
- `run_events`
- `run_bodies`
- `settings`
- `secrets`
- `backup_manifests`

Use typed JSON config for protocol-specific request fields. This preserves fast
protocol iteration while keeping tree, run history, event pagination, settings,
and body metadata queryable.

Required schema adjustments before main UI cutover:

- Store file is now `yaku.sqlite`.
- Body directory is now `yaku-bodies`.
- Add explicit destructive schema reset policy during active Yaku development.
- Add stable request config Rust enums for HTTP, GraphQL, gRPC, WebSocket, and
  SSE instead of exposing `BTreeMap<String, Value>` as the long-term domain API.
- Add app-level settings records that replace old `Settings`. Baseline Yaku app
  settings now use the `settings` table under the `app.settings` key.
- HTTP auth secrets are extracted from request config into the `secrets` table.
  Request config stores `passwordSecretId` / `tokenSecretId` references, and
  Tauri resolves those references only when sending a request. Desktop runtime
  stores secret values in the OS keychain and stores only keychain references in
  `secrets.ciphertext`; tests use local plaintext fakes.
- HTTP request config supports `bodyMode` for `text`, `json`, `file`, and
  `multipart`. File body configs store only `bodyFilePath`; multipart file
  parts store only `filePath`. The desktop bridge validates file paths at send
  time and the engine records only file metadata in request body events.
- GraphQL request config now has first-class `graphqlQuery`,
  `graphqlVariables`, and `graphqlOperationName` fields. The engine normalizes
  GraphQL sends to `POST` JSON and builds the runtime payload from those fields
  while still tolerating legacy JSON `body` payloads.
- Cookie jars are Yaku-native store records (`cookie_jars` / `cookies`). HTTP
  requests may reference `cookieJarId`; the engine sends matching cookies,
  stores `Set-Cookie` response headers back into the jar, and redacts cookie
  header values from run events.
- Workspace backups are format v3 and include `secrets`, cookie jars, and
  cookies, so auth secret references and cookie state survive export/import.
- Add workspace UI state records for active environment, recent requests, and
  layout state.

## Frontend State Model

Replace old global Jotai model atoms with resource queries:

- `useYakuWorkspaces()`
- `useYakuWorkspace(workspaceId)`
- `useYakuRequestTree(workspaceId)`
- `useYakuRequest(requestId)`
- `useYakuEnvironments(workspaceId)`
- `useYakuRunHistory(requestId)`
- `useYakuRunEvents(runId)`
- `useYakuRunBodies(runId)`
- `useYakuSettings()`

Local UI state can remain Jotai or component state. Persisted app state must go
through Yaku settings commands. Query keys should live in one module, not be
hand-written across pages.

## Main Route Rewrite

Target routes:

- `/workspaces`: list/create/select Yaku workspaces.
- `/workspaces/$workspaceId`: Yaku workspace shell.

`/v2` and `/debug/yaku` do not remain product routes.

## Yaku Workspace Shell

Build new components under `src/features/yaku-workspace`:

- `YakuWorkspaceShell`
- `YakuWorkspaceSidebar`
- `YakuWorkspaceTree`
- `YakuRequestEditor`
- `YakuRequestEditorHttp`
- `YakuRequestEditorGraphql`
- `YakuRequestEditorGrpc`
- `YakuRequestEditorWebSocket`
- `YakuRequestEditorSse`
- `YakuRunPanel`
- `YakuRunTimeline`
- `YakuBodyViewer`
- `YakuEnvironmentPanel`
- `YakuWorkspaceSettingsPanel`

These components must import Yaku types and Yaku query hooks only. They must not
import `@yakumo-internal/models`.

## Send Runtime

`cmd_yaku_send_request` remains as a compatibility blocking command. The main
workspace uses the non-blocking lifecycle:

- `cmd_yaku_run_start(requestId, environmentId?) -> Run`
- `cmd_yaku_run_cancel(runId) -> Run`
- `cmd_yaku_run_events(runId, cursor?, limit?)`
- `cmd_yaku_run_bodies(runId)`
- Tauri event stream: `yaku_run_lifecycle`

Runtime ownership:

- Tauri owns a run task registry keyed by `run_id`.
- `yaku-engine` can reuse a pre-created running run. Cancellation now propagates
  a `CancellationToken` from the Tauri run registry into HTTP, SSE, WebSocket,
  and gRPC senders. The stored run is marked cancelled and terminal-state
  overwrite remains blocked.
- Engines append events to the store before emitting UI events.
- UI subscribes to Tauri events and invalidates specific run queries.

## Type Generation

Use generated Rust TS bindings as the canonical frontend domain types.

Current state:

- Import generated domain types from `crates/yaku-domain/bindings/gen_domain.ts`.
- Add generated command DTOs for page responses, GC reports, delete responses,
  and event payloads.
- `src/lib/yaku-client/types.ts` is the only app-facing type barrel.
- The old frontend V2 compatibility shim has been removed.

## Aggressive Rename Plan

### Rename Now

- User-facing docs and new code: `Yaku`.
- The old frontend V2 shim was split to `src/lib/yaku-client/*` and removed.
- Frontend Yaku client public APIs use `Yaku*` names.
- `src-tauri/src/yaku_commands.rs`.
- Tauri commands use `cmd_yaku_*`.
- Store file and body directory to `yaku.sqlite` / `yaku-bodies`.
- `/v2`, `/debug/yaku`, and deprecated request-path focus routes are removed;
  `/workspaces` is the only workspace shell entry.

### Renamed During Core Cutover

- `yaku-domain`.
- `yaku-store`.
- `yaku-engine`.
- Workspace Cargo dependencies and crate imports now use the Yaku names.

### Rename Later Or Only With Explicit Approval

- App bundle identifier.
- Release tags.
- Installed app name.
- Old crates that are scheduled for deletion.
- Old `@yakumo-internal/models` package.

## Deletion Plan

Phase 1: Establish Yaku main path.

- Add Yaku generated type imports.
- Split the old frontend V2 shim into `src/lib/yaku-client/commands.ts`,
  `queries.ts`, `types.ts`, and `events.ts`. Done; the old shim is deleted.
- Create `src/features/yaku-workspace`.
- Point `/workspaces` and `/workspaces/$workspaceId` at Yaku components.
- Delete `/v2`, `/debug/yaku`, and deprecated request-path focus routes after
  `/workspaces` parity. Done.

Phase 2: Remove startup dependency on old models.

- Remove `initModelStore(jotaiStore)` from `src/main.tsx`. Done.
- Remove `initSync()` from startup unless a Yaku sync/import replacement exists.
  Done.
- Remove `StartupGate`; Yaku commands open the Yaku store lazily instead of
  blocking app startup on global model loading. Done.
- Stop registering `models_ext::init()` once no legacy route is compiled.

Phase 3: Replace send and response panes.

- Implement start/cancel/event-stream run lifecycle. Done for start/cancel and
  lifecycle events; transport-level cancellation is wired through Yaku engine
  senders.
- Move HTTP/GraphQL response viewing onto Yaku body/event data.
- Add binary/download/content-type viewer routing.
- Port gRPC, WebSocket, and SSE panels onto the same run/event model.

Phase 4: Rename core crates.

- Rename crate directories and package names.
- Update Cargo workspace members, dependencies, imports, and generated binding
  paths.
- Run workspace check before deleting old crates.

Phase 5: Delete old app surface.

- Delete old workspace components and hooks that import
  `@yakumo-internal/models`. Done for the desktop frontend: old model-backed
  workspace dialogs, git/sync UI, template/auth subscriptions, response viewers,
  and request hooks were removed from `src`.
- Delete old model commands from `src-tauri/src/lib.rs`. Done: the invoke
  handler now exposes only app shell commands plus `cmd_yaku_*`.
- Delete `src-tauri/src/models_ext.rs` and old request/history command modules
  once no registered command needs them. Done for the desktop runtime:
  `models_ext` is gone, old request command modules are gone, and launch
  history now persists through Yaku settings.
- Remove `@yakumo-internal/models` imports from `src`. Done.
- Reassess whether `crates/yakumo-models` is still needed by non-desktop crates.
  Done: `crates/yaku-cli/src` now uses the Yaku store/engine path for default
  workspace/request/folder/environment/send commands, old CLI command modules
  plus legacy integration tests were removed, and `crates/yakumo-models` has
  been deleted together with the isolated legacy `yakumo-crypto`,
  `yakumo-http`, and `yakumo-ws` helper crates. `yakumo-app` no longer depends
  on `yakumo-features` for toast events either; the small `show_toast` payload
  type lives inside `src-tauri`. Frontend UI-only contracts have moved to
  `src/lib/yaku-ui-types.ts`.
- Delete unused legacy crates once no runtime path references them. Done for the
  old umbrella and optional feature chain: `crates/yakumo`,
  `crates/yakumo-features`, `crates/yakumo-git`, `crates/yakumo-sync`, and
  `crates/yakumo-license` were removed. The remaining unused helper crates
  `crates/yakumo-core` and `crates/yakumo-sse` were removed as well.

Phase 6: Rebuild optional capabilities.

- One-way legacy importer, if wanted.
- Yaku backup/export/import. Baseline native workspace backup import/export is
  implemented through `cmd_yaku_backup_export` and `cmd_yaku_backup_import`.
  Backup format v2 includes workspace secrets.
  Legacy AnyModel import/export dialogs, commands, and the old importer module
  are removed from the desktop surface. `import-data` deep-link handling is also
  removed; Yaku backup import/export is the only supported desktop backup path.
- Yaku settings/secrets UI. Baseline app settings, proxy, and certificate UX are
  implemented through `app.settings`. Auth values now use the Yaku secrets table
  and OS keychain storage, but a dedicated secrets management UI remains
  follow-up work.
- Yaku CLI parity for protocols beyond HTTP. Baseline parity is now provided by
  the Yaku-native command path. Top-level `workspace`, `request`, `folder`,
  `environment`, `run`, `backup`, and `send` commands now use Yaku-native
  argument types; the old hidden `v2` compatibility alias has been removed.

## Proposed Commit Sequence

1. `docs: define yaku-first rewrite plan`
2. `refactor: split yaku client from v2 bridge`
3. `refactor: rename v2 tauri commands to yaku`
4. `feat: add yaku workspace shell`
5. `refactor: route workspaces to yaku shell`
6. `refactor: remove legacy model startup`
7. `feat: add yaku streaming run lifecycle`
8. `refactor: rename yaku core crates`
9. `refactor: delete legacy workspace surface`
10. `feat: add yaku settings and import/export baseline`

Each commit should compile independently unless explicitly marked as a
mechanical rename commit with no behavior change.

## Validation Baseline

Run after each commit:

- `bun run --cwd src typecheck`
- `bun run --cwd src build`
- `cargo check -p yakumo-app`
- `cargo test -p yaku-domain --lib`
- `cargo test -p yakumo-app yaku_commands --lib`

Run before large deletions:

- `rg "@yakumo-internal/models" src`
- `rg "models_ext|models_" src-tauri/src`
- `rg "cmd_v2|v2.sqlite|v2-bodies" src src-tauri crates`
- Search `src` for old uppercase V2 client/helper names.
- `cargo check --workspace`
