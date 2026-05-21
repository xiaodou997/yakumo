# Desktop Smoke Test

Run these checks against a production `.app` build before release verification. Keep the scope to desktop behavior and packaging; do not exercise publishing automation here.

## Production Startup

1. Build with `bun run --cwd src build`.
2. Build the local app bundle with `bun run tauri build --bundles app`.
3. Open the generated `.app`.
4. Confirm a loading state appears immediately and the app reaches the workspace screen without a blank first paint.
5. Quit and reopen once to catch cached-start regressions.

## Protocols

1. GraphQL: open or create a GraphQL request, edit query and variables, send it, and confirm the response viewer and GraphQL docs panel still work.
2. gRPC: open a saved gRPC request, connect, send a message, and confirm request and response panes update.
3. WebSocket: connect to a WebSocket endpoint, send a message, receive a message, disconnect, and reconnect.
4. SSE: start an SSE request and confirm streamed events append without blocking the rest of the UI.

## Network Settings

1. Client certificates: add or select a certificate in settings, send a request requiring it, then remove or disable it and confirm the UI updates.
2. Proxy: enable a proxy setting, send a request through it, then disable proxy and repeat the request.
3. Cookie jar is intentionally out of this smoke path until a Yaku-native cookie store is designed.

## Workspace

1. Switch workspaces and confirm requests, folders, environments, and settings load for the selected workspace.
2. Create, rename, duplicate, move, and delete a request to verify Yaku store updates reach the tree and editor.
3. Create, rename, move, and delete a folder to verify tree persistence.
4. Export a Yaku workspace backup and import it into an empty workspace profile.

## Settings

1. Open settings and confirm the shell appears quickly.
2. Visit General, Interface, Shortcuts, Certificates, Proxy, and License tabs.
3. Confirm each tab loads only after it is selected and changing a setting persists after closing and reopening settings.
4. Confirm Escape closes settings when shown as a window or dialog.
