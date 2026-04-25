# Yakumo API

Yakumo API is a local-first desktop API client for HTTP, GraphQL, gRPC, WebSocket, and SSE workflows. It is built with Tauri, Rust, React, and TypeScript.

This project is derived from the open-source Yaak project and keeps the original MIT license and attribution.

## Current Scope

- Desktop app builds remain the primary supported distribution path.
- `yaku` is kept as a local AI-friendly CLI built from source.
- npm CLI packages, plugin API npm publishing, Flatpak, sponsors, and old Yaak release flows are frozen until the Yakumo release pipeline is rebuilt.
- The JavaScript plugin system is removed from the product surface. Core capabilities are implemented as built-in Yakumo features.

## Capabilities

- Create and send HTTP, GraphQL, gRPC, WebSocket, and SSE requests.
- Organize requests with workspaces, folders, environments, cookie jars, and sync metadata.
- Use built-in auth, template functions, importers, response tooling, and request actions.
- Encrypt workspace secrets using the operating-system keychain through `yaak-crypto`.
- Use `yaku` for schema/list/show/create/update/delete workflows and HTTP send automation.

For the implementation status matrix, see [`FEATURES.md`](FEATURES.md). For the active refactor roadmap, see [`docs/yakumo-refactor-roadmap.md`](docs/yakumo-refactor-roadmap.md).

## Development

```bash
bun install
bun run typecheck
bun run lint
bun run build
cargo check --locked --workspace --all-targets
```

Use `YAKUMO_DEV_PORT` to override the desktop development port. The default is `1420`.

## Useful Resources

- [Original Yaak Project](https://github.com/mountain-loop/yaak)
- [Tauri Documentation](https://v2.tauri.app/)

## License

MIT License. Yakumo API keeps the original Yaak copyright notices and adds independent maintenance on top.
