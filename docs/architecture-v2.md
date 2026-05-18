# Yakumo V2 Architecture

## Goals

Yakumo V2 is a local-first personal API client with a shared Rust core for the
desktop app and `yaku` CLI. The desktop UI remains Tauri + React for now, but
business rules, request execution, persistence, and backup logic must be UI
independent.

V2 may break all historical data and code compatibility. Existing Yaak/Yakumo
migrations are not a constraint for the new schema.

## Product Scope

- Supported platforms: macOS, Windows, and Linux.
- Primary product: desktop API client.
- First-class CLI: `yaku` must use the same domain, store, and engine crates as
  the desktop app.
- First V2 feature slice: HTTP, GraphQL, workspace/request tree, run history,
  and response viewer.
- Core protocol direction: HTTP, GraphQL, gRPC, WebSocket, and SSE all use the
  same run/event lifecycle.
- Backup scope: personal backup only. No team sync, cloud sync, permissions,
  remote collaboration, or JavaScript plugin runtime.

## Non-Goals

- No historical database migration requirement.
- No JavaScript plugin system.
- No npm CLI release path.
- No team conflict-resolution workflow.
- No UI framework rewrite in the first V2 phase.

## Crate Boundaries

```text
React UI
  Tauri command bridge
    yakumo-domain
      yakumo-engine
      yakumo-store
    yaku CLI
```

### yakumo-domain

Pure business types and service contracts. This crate must not depend on Tauri,
React, rusqlite, reqwest, tonic, or filesystem-specific implementations.

Responsibilities:

- Workspace and request-tree domain types.
- Request draft and protocol-specific configuration types.
- Run, run-event, and run-body metadata types.
- Domain IDs and validation primitives.
- Service traits used by desktop and CLI.

### yakumo-store

SQLite-backed persistence for V2. This crate owns schema creation and typed
storage operations.

Responsibilities:

- Create a clean `schema_v2`.
- Store workspaces, request nodes, requests, environments, runs, run events,
  run bodies, settings, secrets metadata, and backup manifests.
- Provide paginated reads for request tree, run history, and run events.
- Never expose raw `AnyModel`-style writes to UI code.

### yakumo-engine

Future crate for request execution. It will transform domain request drafts into
protocol runs and append run events through store abstractions.

Responsibilities:

- HTTP and GraphQL first.
- gRPC, WebSocket, and SSE through the same run/event lifecycle.
- Unified cancellation, timing, headers, cookies, TLS, proxy, DNS, and body
  capture behavior.

## V2 Data Model

Initial tables:

- `workspaces`: personal API workspaces.
- `request_nodes`: tree entries for folders and requests.
- `requests`: protocol-agnostic request metadata plus protocol-specific config.
- `environments`: environment variables scoped to a workspace.
- `runs`: one execution of a request.
- `run_events`: append-only timeline for HTTP, GraphQL, gRPC, WebSocket, and
  SSE.
- `run_bodies`: body/blob metadata for large request/response payloads.
- `settings`: app-level settings.
- `secrets`: encrypted secret metadata.
- `backup_manifests`: personal backup bookkeeping.

## Run Lifecycle

Every send creates a `run`. A run has append-only events:

```text
created -> resolving -> connecting -> headers -> body_chunk* -> completed
created -> ... -> failed
created -> ... -> cancelled
```

HTTP response headers, GraphQL response data, gRPC messages, WebSocket frames,
and SSE messages are all represented as `run_events`. UI reads events by cursor
or page size, not by loading a full workspace history.

## Frontend State

The UI must move away from a single full-workspace model store. V2 frontend
state should be query-shaped:

- Workspace list.
- Active workspace request tree.
- Active request draft.
- Run history page for the active request.
- Run event page/stream for the active run.

Writes must call explicit commands such as `create_request`, `move_request`,
`send_request`, `cancel_run`, and `delete_workspace`.

## Backup

Personal backup uses deterministic JSON or YAML files with stable ordering and
content hashes. Secrets are excluded by default. If secret backup is enabled,
only encrypted secret bundles are exported.

## Security Baseline

Workspace secrets are encrypted at rest. The default key source is the operating
system keychain. V2 does not implement team permissions or a cloud threat model.

## Migration Strategy

V2 may create a fresh database and ignore old migrations. If old data import is
needed later, implement a one-way importer instead of preserving old schema
compatibility in the main store.

## First Implementation Milestones

1. Add `yakumo-domain` with stable V2 domain types.
2. Add `yakumo-store` with clean schema creation and basic workspace/request
   persistence tests.
3. Add `yakumo-engine` HTTP/GraphQL run execution against the V2 run/event
   model.
4. Switch `yaku` to the V2 domain/store/engine path.
5. Switch Tauri commands from `AnyModel` writes to explicit V2 commands.
6. Refactor React state to query-shaped reads and paginated run history.

## Current Scaffold Status

- `yakumo-domain` exists and exports V2 workspace, request tree, request, run,
  run event, protocol, state, and pagination types.
- `yakumo-store` exists with schema creation, workspace upsert/read, request
  tree upsert/read, run upsert, run history pagination, and run event append/read
  by cursor.
- The scaffold is intentionally not wired into the existing Tauri UI or `yaku`
  CLI yet. Old code remains runnable while the V2 core is built in parallel.
