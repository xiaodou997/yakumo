# Yakumo API

Yakumo API is a local-first desktop API client for HTTP, GraphQL, gRPC, WebSocket, and SSE workflows. It is built with Tauri, Rust, React, and TypeScript.

This project is derived from the open-source Yaak project and keeps the original MIT license and attribution.

## Current Scope

- Desktop app builds remain the primary supported distribution path.
- `yaku` is kept as a local AI-friendly CLI built from source.
- npm CLI packages, plugin API npm publishing, Flatpak, sponsors, and old Yaak release flows have been removed from this codebase.
- The JavaScript plugin system is removed from the product surface. Core capabilities are implemented as built-in Yakumo features.

## macOS Test Builds

Current macOS release artifacts are temporary unsigned test builds. If macOS reports that the app is damaged or cannot verify the developer, see [`docs/macos-damaged-app.md`](docs/macos-damaged-app.md).

## Capabilities

- Create and send HTTP, GraphQL, gRPC, WebSocket, and SSE requests.
- Organize requests with Yaku workspaces, folders, and environments.
- Configure app-level proxy and client certificate settings.
- Import and export native Yaku workspace backups.
- Use `yaku` for schema/list/show/create/update/delete workflows and HTTP send automation.

For the implementation status matrix, see [`docs/feature-status.md`](docs/feature-status.md). For the maintained project documents, see [`docs/README.md`](docs/README.md).

## Development

```bash
bun install
bun run typecheck
bun run lint
bun run build
bun run test
cargo check --locked --workspace --all-targets
```

Use `YAKUMO_DEV_PORT` to override the desktop development port. The default is `1420`.

## Useful Resources

- [Project Docs](docs/README.md)
- [Original Yaak Project](https://github.com/mountain-loop/yaak)
- [Tauri Documentation](https://v2.tauri.app/)

## License

MIT License. Yakumo API keeps the original Yaak copyright notices and adds independent maintenance on top.
