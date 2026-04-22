# Phase 1 Tasks

## CLI Scaffold

### task-1: Initialize CLI project
- Set up Node.js/TypeScript project in `cli/`
- Configure Commander.js with subcommands: init, generate, review, export, dashboard
- Add bin entry for `npx social-rig`
- Set up tsconfig, eslint, vitest
- Create package.json with proper metadata for npm publishing

### task-2: Config system
- Define config schema (TypeScript types + YAML loader)
- Implement `social-rig init` command
  - Interactive prompts for project name, repo path, voice, audience
  - Detect repo type and suggest defaults
  - Write `.social-rig/config.yaml`
  - Write `.social-rig/ignore` with sensible defaults
  - Register project in SQLite DB and workspace.yaml

## Repo Analyzer

### task-3: Git analyzer
- Parse git log for recent commits (last 30 days, configurable)
- Extract release tags and their dates
- Identify top contributors
- Detect commit patterns (features, fixes, docs)
- Handle both local repos and remote GitHub URLs

### task-4: File analyzer
- Read and parse README.md (extract sections, features, description)
- Read CHANGELOG.md / RELEASES.md
- Detect and parse package manifests (package.json, go.mod, Cargo.toml, pyproject.toml, Gemfile)
- Extract tech stack, dependencies, language breakdown

### task-5: GitHub API analyzer
- Fetch repo metadata (stars, forks, watchers, topics)
- Fetch recent releases with release notes
- Fetch recent issues/PRs (open, closed, trending)
- Handle rate limits and auth (optional GitHub token)
- Graceful fallback when API unavailable (local-only mode)

### task-6: Project profile generator
- Aggregate all analyzer outputs into ProjectProfile
- Extract GroundedFacts from README features/descriptions
- Write `project-profile.yaml` to `.social-rig/` for user review
- Confidence tagging: explicit (directly stated) vs inferred

## Content Generator

### task-7: Copywriting frameworks
- Implement PAS (Problem-Agitate-Solution) template
- Implement AIDA (Attention-Interest-Desire-Action) template
- Implement BAB (Before-After-Bridge) template
- Framework selection logic based on content type

### task-8: Content strategy engine
- Map project profile to content types
  - New release → release_announcement
  - Notable feature → feature_highlight
  - High commit activity → behind_the_scenes
  - Good docs → tutorial_teaser
  - Milestone (stars, contributors) → milestone_celebration
- Select framework per content type
- Generate ContentPlan with angles and source facts

### task-9: AI provider abstraction
- Define AIProvider interface
- Implement OpenAI provider (GPT-4o)
- Implement Anthropic provider (Claude)
- Implement Ollama provider (local models)
- Prompt engineering: system prompt with copywriting rules, voice config, grounding requirements
- Response parsing and validation

### task-10: AI provider auto-detection
- Scan environment variables (OPENAI_API_KEY, ANTHROPIC_API_KEY, GITHUB_TOKEN)
- Scan Copilot CLI config (~/.copilot/config.json)
- Scan Cursor config (~/.cursor/)
- Scan Aider config (~/.aider.conf.yml)
- Scan Continue config (~/.continue/config.json)
- Scan Claude CLI config (~/.claude/ or ~/.config/claude/)
- Detect running Ollama instance (ping localhost:11434)
- Return DetectedProvider[] sorted by detection priority
- Integrate into init flow: show detected providers, let user pick
- Store source reference in config, never store keys

### task-11: Draft generator
- Take ContentPlan + ProjectProfile + AIProvider
- Generate platform-specific variants (X: 280 chars, LinkedIn: long-form, etc.)
- Enforce source grounding (every claim links to a fact)
- Apply banned phrase filter
- Apply tone consistency check
- Write Draft[] to SQLite (drafts + draft_variants tables)
- Log generation activity to activity_log

### task-12: Image generation (optional)
- Define ImageGenerator interface
- Implement OpenAI DALL-E 3 provider
- Implement Stability AI provider
- Image types: OG cards (headline + brand colors), feature visuals, abstract mood
- Attach generated images to drafts when enabled
- Graceful skip when images.enabled is false or no image provider key found

## Connectors (Plugin System)

### task-13: Connector plugin interface
- Define ConnectorPlugin interface with CapabilityFlags
- Define plugin discovery and loading (registry)
- Plugin install command: `npx social-rig plugin add <name>`
- Plugin list command: `npx social-rig plugin list`
- Builtin connectors: X, LinkedIn, Dev.to, Hashnode (stubs for Phase 1, full impl in Phase 2)

## Multi-Project

### task-14: Workspace manager
- Define workspace.yaml schema at ~/.social-rig/
- `npx social-rig init` registers project in workspace automatically
- `--project <name>` flag on all commands
- `--all` flag for batch operations across projects
- `npx social-rig status` shows overview of all projects

## Review and Export

### task-15: Terminal review UI
- Interactive review flow: show draft, platform variant, source facts
- Show attached image preview path when available
- Actions: approve, edit (opens $EDITOR), reject, regenerate (with feedback)
- Batch mode: review all pending drafts sequentially
- Status tracking reads/writes SQLite drafts table
- Log review actions to activity_log

### task-16: Export system
- Export approved drafts to markdown files (one per draft)
- Export to JSON (structured, for automation)
- Copy to clipboard (single draft)
- Export images alongside drafts
- Read all data from SQLite
- Summary output: "5 drafts generated, 3 approved, 2 rejected"

## SQLite Data Layer

### task-19: Database schema and migrations
- Set up better-sqlite3 with auto-migration on first access
- Define tables: projects, drafts, draft_variants, calendar_entries, connectors, activity_log
- Numbered migration files applied in order
- Connection singleton (shared by CLI commands and dashboard server)
- CRUD operations for each table (db/drafts.ts, db/projects.ts, db/calendar.ts, db/activity.ts)
- Bidirectional sync between workspace.yaml and projects table

### task-20: Migrate CLI operations to SQLite
- `social-rig generate` writes drafts to DB instead of YAML files
- `social-rig review` reads/writes draft status from DB
- `social-rig status` queries DB for counts across all projects
- `social-rig export` reads approved drafts from DB
- `social-rig init` creates project row in DB
- Remove file-based draft storage (.social-rig/drafts/*.yaml)

## Dashboard

### task-21: Dashboard server
- Hono HTTP server started by `social-rig dashboard` command
- REST API routes: /api/drafts, /api/projects, /api/calendar, /api/connectors, /api/plugins, /api/stats, /api/activity
- All routes read/write SQLite via the shared db module
- Static asset serving from bundled dist/ directory
- Auto-open browser on startup (configurable with --no-open)
- --port flag (default 3847)

### task-22: Dashboard UI - Scaffold and layout
- React + Vite project in cli/src/dashboard-ui/
- Sidebar navigation: Dashboard, Drafts, Calendar, Config, Plugins, Projects
- Responsive layout with collapsible sidebar
- Light/dark theme support
- API client with typed fetch wrappers for all routes
- Build produces static dist/ bundled into npm package

### task-23: Dashboard UI - Drafts page
- List drafts with filters: project, status, platform, content type
- Draft detail view with all platform variants side by side
- Inline editing of variant text (headline, body, hashtags, CTA)
- Approve/reject/regenerate actions
- Bulk actions: approve all, reject selected
- Source facts panel showing grounded claims
- Image preview when attached

### task-24: Dashboard UI - Calendar page
- Month/week/day calendar views
- Color-coded entries by project
- Platform icons on each calendar entry
- Drag-and-drop scheduling (move draft to time slot)
- Click entry to view/edit the draft
- Unscheduled drafts panel (drag onto calendar to schedule)

### task-25: Dashboard UI - Config and plugins pages
- Config page: visual editor for .social-rig/config.yaml
  - Voice settings (tone picker, audience, banned phrases)
  - AI provider selection (detected providers dropdown)
  - Content types toggles
  - Platform enable/disable
  - Image generation settings
  - Schedule preferences
  - Saves to YAML file on change
- Plugins page: installed connectors list with capability badges
  - Available community plugins
  - Install/remove buttons
  - Test connection button
  - Capability matrix view

### task-26: Dashboard UI - Projects and home pages
- Projects page: list all workspace projects with stats
  - Add project (local path or GitHub URL)
  - Switch active project
  - Per-project stats (generated, approved, published counts)
  - Remove project
- Home page: stats cards (pending/approved/published counts)
  - Upcoming calendar entries (next 7 days)
  - Recent activity feed
  - Quick action buttons (generate, review)

## Testing and Polish

### task-17: Test suite
- Unit tests for analyzers (mock git, mock files, mock GitHub API)
- Unit tests for AI auto-detection (mock config files, env vars)
- Unit tests for framework templates
- Unit tests for content strategy mapping
- Unit tests for plugin registry and loading
- Unit tests for SQLite CRUD operations (in-memory DB)
- Unit tests for dashboard API routes (supertest)
- Integration test: init → generate → review → export on a sample repo
- Integration test: dashboard server starts, API returns correct data
- Snapshot tests for draft output format

### task-18: Documentation and packaging
- README.md with quick start, examples, config reference
- Document auto-detection sources and priority
- Document plugin authoring guide
- Document dashboard usage and screenshots
- npm package configuration for `npx social-rig`
- esbuild config to bundle dashboard server + pre-built UI assets
- GitHub repo setup with CI (lint, test, build)
- Dogfood: run social-rig on social-rig repo, include output in README
