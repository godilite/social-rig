export const migrations: string[] = [
  `
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    repo TEXT NOT NULL,
    description TEXT,
    config_path TEXT,
    profile_json TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    content_type TEXT NOT NULL,
    framework TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    source_facts_json TEXT,
    image_path TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    reviewed_at TEXT,
    scheduled_at TEXT
  );

  CREATE TABLE IF NOT EXISTS draft_variants (
    id TEXT PRIMARY KEY,
    draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    headline TEXT,
    body TEXT NOT NULL,
    hashtags_json TEXT DEFAULT '[]',
    cta TEXT,
    char_count INTEGER,
    published_at TEXT,
    published_url TEXT,
    published_id TEXT
  );

  CREATE TABLE IF NOT EXISTS calendar_entries (
    id TEXT PRIMARY KEY,
    draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id),
    platform TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS connectors (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    is_builtin INTEGER DEFAULT 0,
    config_json TEXT DEFAULT '{}',
    credentials_json TEXT DEFAULT '{}',
    installed_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT REFERENCES projects(id),
    action TEXT NOT NULL,
    details_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
  );
  `,
]
