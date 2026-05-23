PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_info
(
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO schema_info (key, value)
VALUES ('schema_version', '2')
ON CONFLICT(key) DO UPDATE SET value = excluded.value;

CREATE TABLE IF NOT EXISTS workspaces
(
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS request_nodes
(
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_id    TEXT REFERENCES request_nodes(id) ON DELETE CASCADE,
    request_id   TEXT,
    kind         TEXT NOT NULL,
    name         TEXT NOT NULL,
    sort_key     TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    CHECK (
        (kind = '"folder"' AND request_id IS NULL)
        OR (kind = '"request"' AND request_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_request_nodes_workspace_parent
    ON request_nodes (workspace_id, parent_id, sort_key);

CREATE TABLE IF NOT EXISTS requests
(
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    protocol     TEXT NOT NULL,
    name         TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    config       TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_requests_workspace
    ON requests (workspace_id);

CREATE TABLE IF NOT EXISTS environments
(
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    variables    TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs
(
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    request_id   TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    protocol     TEXT NOT NULL,
    state        TEXT NOT NULL,
    started_at   TEXT NOT NULL,
    completed_at TEXT,
    status_code  INTEGER,
    error        TEXT
);

CREATE INDEX IF NOT EXISTS idx_runs_request_started
    ON runs (request_id, started_at DESC);

CREATE TABLE IF NOT EXISTS run_events
(
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id       TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    sequence     INTEGER NOT NULL,
    kind         TEXT NOT NULL,
    data         TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    UNIQUE (run_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_run_events_run_sequence
    ON run_events (run_id, sequence);

CREATE INDEX IF NOT EXISTS idx_run_events_run_kind_sequence
    ON run_events (run_id, kind, sequence);

CREATE TABLE IF NOT EXISTS run_bodies
(
    id             TEXT PRIMARY KEY,
    run_id         TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    workspace_id   TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    event_id       INTEGER REFERENCES run_events(id) ON DELETE SET NULL,
    body_role      TEXT NOT NULL,
    content_type   TEXT,
    byte_length    INTEGER NOT NULL,
    storage_kind   TEXT NOT NULL,
    storage_ref    TEXT NOT NULL,
    created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings
(
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS secrets
(
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    ciphertext   TEXT NOT NULL,
    metadata     TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cookie_jars
(
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cookie_jars_workspace
    ON cookie_jars (workspace_id, name);

CREATE TABLE IF NOT EXISTS cookies
(
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    jar_id       TEXT NOT NULL REFERENCES cookie_jars(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    value        TEXT NOT NULL,
    domain       TEXT NOT NULL,
    path         TEXT NOT NULL,
    expires_at   TEXT,
    secure       INTEGER NOT NULL,
    http_only    INTEGER NOT NULL,
    same_site    TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    UNIQUE (jar_id, domain, path, name)
);

CREATE INDEX IF NOT EXISTS idx_cookies_jar_domain_path
    ON cookies (jar_id, domain, path);

CREATE TABLE IF NOT EXISTS backup_manifests
(
    id           TEXT PRIMARY KEY,
    workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
    content_hash TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    metadata     TEXT NOT NULL
);
