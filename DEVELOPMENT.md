# Developer Setup

Yaak is a combined Bun, Node.js-runtime, and Rust monorepo. It is a [Tauri](https://tauri.app) project, so it uses Rust and HTML/CSS/JS for the main application. The plugin system still uses a vendored Node.js sidecar that communicates with the app over gRPC.

## Prerequisites

Make sure you have the following tools installed:

- [Bun](https://bun.sh) (v1.3+)
- [Rust](https://www.rust-lang.org/tools/install)

Check the installations with the following commands:

```shell
bun --version
rustc --version
```

Install dependencies and run the initial setup:

```shell
bun install
bun run bootstrap
```

## Run the App

Start the app in development mode:

```shell
bun run dev
```

The dev command automatically checks the vendored assets required by Tauri and prepares missing Protocol Buffers includes, plugin runtime files, bundled plugins, and the vendored Node runtime.

## SQLite Migrations

New migrations can be created with:

```shell
bun run migration
```

Rerun the app to apply the migrations.

_Note: For safety, development builds use a separate database location from production builds._

## Lezer Grammar Generation

```sh
# Example
lezer-generator components/core/Editor/<LANG>/<LANG>.grammar > components/core/Editor/<LANG>/<LANG>.ts
```

## Linting, Formatting, and Types

This repo uses [Biome](https://biomejs.dev/) for formatting and base linting, plus TypeScript for type checking.

```sh
bun run lint
bun run format
bun run typecheck
```

Some workspace packages also run `tsc --noEmit` in their own lint or typecheck scripts.
