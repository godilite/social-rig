# Dashboard Spec

## Overview

A localhost web dashboard bundled into the CLI. Users run `npx social-rig dashboard` and get a full visual interface for managing drafts, calendar, config, plugins, and projects. All data lives in SQLite. Zero external dependencies.

## Architecture

```
$ npx social-rig dashboard

  Dashboard running at http://localhost:3847
  Press Ctrl+C to stop

┌────────────────────────────────────────────────────┐
│   CLI commands ──┐                                 │
│                  ▼                                 │
│          ┌──────────────┐                          │
│          │   SQLite DB   │  ~/.social-rig/data.db  │
│          └──────┬───────┘                          │
│          ┌──────┴───────┐                          │
│          ▼              ▼                          │
│     CLI output    Dashboard server                 │
│     (terminal)    (localhost:3847)                  │
│                        │                           │
│                  ┌─────┴──────┐                    │
│                  │  REST API  │                    │
│                  │  + Static  │                    │
│                  │   assets   │                    │
│                  └────────────┘                    │
└────────────────────────────────────────────────────┘
```

## Data Layer: SQLite

Single database file at `~/.social-rig/data.db`. All CLI commands and dashboard read/write from the same DB.

### Schema

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  repo TEXT NOT NULL,
  description TEXT,
  config_path TEXT,
  profile_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drafts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  content_type TEXT NOT NULL,
  framework TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  source_facts_json TEXT,
  image_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  scheduled_at DATETIME
);

CREATE TABLE draft_variants (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES drafts(id),
  platform TEXT NOT NULL,
  headline TEXT,
  body TEXT NOT NULL,
  hashtags_json TEXT,
  cta TEXT,
  char_count INTEGER,
  published_at DATETIME,
  published_url TEXT,
  published_id TEXT
);

CREATE TABLE calendar_entries (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES drafts(id),
  project_id TEXT NOT NULL REFERENCES projects(id),
  platform TEXT NOT NULL,
  scheduled_at DATETIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE connectors (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  is_builtin BOOLEAN DEFAULT FALSE,
  config_json TEXT,
  credentials_json TEXT,
  installed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT REFERENCES projects(id),
  action TEXT NOT NULL,
  details_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Hybrid storage model

- **SQLite** (`~/.social-rig/data.db`): All operational data (drafts, variants, calendar, connectors, activity)
- **YAML file** (`.social-rig/config.yaml` per project): Project config (voice, audience, AI provider, content types). Stays as a file so it can be committed to git and shared with teammates.
- **Workspace YAML** (`~/.social-rig/workspace.yaml`): Project registry. Synced bidirectionally with the `projects` table.

## Dashboard Server

Lightweight HTTP server bundled into the CLI package. No separate install.

### Tech stack

| Component | Choice | Why |
|-----------|--------|-----|
| HTTP | Hono | Lightweight (14KB), fast, runs anywhere |
| DB | better-sqlite3 | Synchronous SQLite, zero config, fast |
| Frontend | React + Vite | Pre-built at publish time, served as static assets |
| Bundling | esbuild | Bundles server + assets into the npm package |

### API Routes

```
GET    /api/projects                     List all projects
GET    /api/projects/:id                 Get project details + profile
PUT    /api/projects/:id/config          Update project config

GET    /api/drafts?project=&status=      List drafts (filterable)
GET    /api/drafts/:id                   Get draft with all variants
PATCH  /api/drafts/:id                   Update draft status (approve/reject)
PUT    /api/drafts/:id/variants/:vid     Edit a variant
POST   /api/drafts/:id/regenerate        Regenerate with feedback
DELETE /api/drafts/:id                   Delete a draft

GET    /api/calendar?month=&project=     Calendar entries for a period
POST   /api/calendar                     Schedule a draft
PATCH  /api/calendar/:id                 Reschedule
DELETE /api/calendar/:id                 Unschedule

GET    /api/connectors                   List installed connectors
POST   /api/connectors/:id/test          Test connector credentials
GET    /api/connectors/:id/capabilities  Get capability flags

GET    /api/plugins                      List available + installed plugins
POST   /api/plugins/install              Install a community plugin
DELETE /api/plugins/:id                  Remove a plugin

GET    /api/activity?project=&limit=     Recent activity log
GET    /api/stats?project=               Dashboard stats (counts, trends)
```

## Dashboard Pages

### 1. Dashboard (Home)

Overview of all projects and recent activity.

```
┌─────────────────────────────────────────────────────────────┐
│  social-rig                                    localhost:3847│
├────────┬────────────────────────────────────────────────────┤
│        │                                                    │
│  📊    │   ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  Home  │   │ Pending  │  │ Approved │  │ Published│       │
│        │   │    12    │  │     5    │  │    23    │       │
│  📝    │   └──────────┘  └──────────┘  └──────────┘       │
│ Drafts │                                                    │
│        │   UPCOMING (next 7 days)                           │
│  📅    │   ┌────────────────────────────────────────┐      │
│  Cal   │   │ Mon: "Feature spotlight: auto-detect"  │      │
│        │   │      X + LinkedIn · social-rig         │      │
│  ⚙️    │   │ Wed: "Why source grounding matters"    │      │
│ Config │   │      Dev.to (article) · social-rig     │      │
│        │   │ Fri: "v1.0.0 launch announcement"      │      │
│  🔌    │   │      X + LinkedIn · copilot-notifier   │      │
│Plugins │   └────────────────────────────────────────┘      │
│        │                                                    │
│  📂    │   RECENT ACTIVITY                                  │
│Projects│   5 drafts generated for social-rig · 2min ago    │
│        │   3 drafts approved for copilot-notifier · 1hr    │
│        │   New project added: acctally · yesterday          │
└────────┴────────────────────────────────────────────────────┘
```

### 2. Drafts

Browse, review, edit, approve/reject drafts. Replaces terminal review as primary surface.

- Filter by project, status, platform, content type
- Inline editing of variant text
- Side-by-side platform preview (X card, LinkedIn post, Dev.to article)
- Bulk actions: approve all, reject all, regenerate selected
- Source facts panel: see which repo facts ground each claim
- Image preview when attached

### 3. Calendar

Visual content calendar with drag-to-schedule.

- Month/week/day views
- Color-coded by project
- Platform icons on each entry
- Drag draft from unscheduled to a time slot
- Click entry to view/edit draft
- Empty slots show "+" to generate content for that day

### 4. Config

Visual config editor. Reads and writes `.social-rig/config.yaml` for the active project.

- Voice settings: tone picker, audience field, banned phrases editor
- AI provider: dropdown of detected providers, manual key entry
- Content types: toggle which types to generate
- Platforms: enable/disable, set per-platform preferences
- Image settings: enable/disable, provider, style, brand colors
- Schedule: posts per week, preferred times
- Changes save to YAML file immediately

### 5. Plugins

Connector management.

- List installed connectors with capability badges
- "Available" tab showing community plugins from registry
- Install/remove with one click
- Test connection button for each connector
- Capability matrix view

### 6. Projects

Multi-project workspace management.

- List all registered projects with stats
- Add project (local path or GitHub URL, triggers init)
- Switch active project
- Per-project stats: drafts generated, approved, published
- Remove project from workspace

## CLI Command

```bash
npx social-rig dashboard [--port 3847] [--no-open]
```

Behavior:
1. Starts Hono HTTP server on specified port
2. Serves pre-built React SPA from bundled assets
3. Opens default browser to `http://localhost:<port>` (unless `--no-open`)
4. Logs requests to terminal
5. Ctrl+C stops the server

## Migration from Files to SQLite

All existing file-based operations switch to SQLite:

| Before (files) | After (SQLite) |
|----------------|----------------|
| `.social-rig/drafts/*.yaml` | `drafts` + `draft_variants` tables |
| Draft status in YAML | `drafts.status` column |
| No calendar | `calendar_entries` table |
| Config in YAML only | Config stays YAML, everything else in DB |
| `workspace.yaml` projects list | `projects` table (synced with YAML) |
| No activity history | `activity_log` table |

## Frontend Build

The dashboard frontend is built at npm publish time, not at runtime.

```
cli/
  src/
    dashboard/
      server.ts          # Hono API server
      db.ts              # SQLite connection + migrations
      routes/            # API route handlers
    dashboard-ui/
      src/               # React app source
      dist/              # Built at publish time → bundled in npm package
      package.json
      vite.config.ts
```

Build pipeline:
1. `cd dashboard-ui && npm run build` produces static assets in `dist/`
2. `esbuild` bundles `server.ts` + embeds `dist/` as static files
3. `npm publish` ships the bundled server with pre-built frontend

Users never run a build step. `npx social-rig dashboard` just works.
