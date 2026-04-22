# Phase 1 Design

## Architecture

```
CLI (Node.js/TypeScript)
├── commands/              # Commander.js command handlers
│   ├── init.ts            # Repo analysis + config creation
│   ├── generate.ts        # Content generation pipeline
│   ├── review.ts          # Terminal review UI
│   ├── export.ts          # Output to md/json/clipboard
│   ├── plugin.ts          # Plugin management (list, add, remove)
│   └── dashboard.ts       # Start localhost dashboard server
├── analyzer/              # Repo intelligence
│   ├── git.ts             # Git log, tags, contributors
│   ├── files.ts           # README, CHANGELOG, docs
│   ├── manifest.ts        # package.json, go.mod, Cargo.toml
│   ├── github.ts          # GitHub API (releases, stars, issues)
│   └── profile.ts         # Aggregates into ProjectProfile
├── generator/             # Content creation
│   ├── strategy.ts        # Content type selection + framework mapping
│   ├── drafts.ts          # AI-powered draft generation
│   ├── grounding.ts       # Source citation and fact verification
│   ├── frameworks.ts      # PAS, AIDA, BAB templates
│   └── images.ts          # AI image generation (OG cards, visuals)
├── ai/                    # AI provider abstraction
│   ├── provider.ts        # Interface
│   ├── detect.ts          # Auto-detect existing AI keys from system
│   ├── openai.ts
│   ├── anthropic.ts
│   └── ollama.ts
├── connectors/            # Plugin-based platform adapters
│   ├── interface.ts       # ConnectorPlugin interface + CapabilityFlags
│   ├── registry.ts        # Plugin discovery and loading
│   └── builtin/           # Ships with social-rig
│       ├── x.ts
│       ├── linkedin.ts
│       ├── devto.ts
│       └── hashnode.ts
├── db/                    # SQLite data layer
│   ├── connection.ts      # better-sqlite3 setup + migrations
│   ├── schema.ts          # Table definitions + migration SQL
│   ├── drafts.ts          # Draft CRUD operations
│   ├── projects.ts        # Project CRUD operations
│   ├── calendar.ts        # Calendar entry operations
│   └── activity.ts        # Activity log operations
├── dashboard/             # Localhost web dashboard
│   ├── server.ts          # Hono HTTP server + static asset serving
│   ├── routes/            # REST API route handlers
│   │   ├── drafts.ts
│   │   ├── projects.ts
│   │   ├── calendar.ts
│   │   ├── connectors.ts
│   │   ├── plugins.ts
│   │   └── stats.ts
│   └── ui/                # React SPA (pre-built at publish time)
│       ├── src/
│       │   ├── pages/     # Dashboard, Drafts, Calendar, Config, Plugins, Projects
│       │   ├── components/
│       │   └── lib/
│       ├── dist/          # Built assets bundled in npm package
│       └── vite.config.ts
├── review/                # Terminal review UI
│   └── terminal.ts        # Interactive approve/edit/reject (reads from SQLite)
├── workspace/             # Multi-project management
│   └── manager.ts         # Workspace config, project switching
└── config/                # Config management
    ├── schema.ts          # Config types
    └── loader.ts          # Read/write .social-rig/config.yaml
```

## Data Flow

```
Repo (local/remote)
    │
    ▼
┌─────────────────┐
│    Analyzer      │  Reads: git log, README, manifests, GitHub API
│                  │  Outputs: ProjectProfile (structured facts)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Strategy Engine │  Inputs: ProjectProfile + UserConfig
│                  │  Selects: content types, frameworks, angles
│                  │  Outputs: ContentPlan (what to generate)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Draft Generator │  Inputs: ContentPlan + AI provider
│                  │  Applies: copywriting frameworks
│                  │  Enforces: source grounding, tone rules
│                  │  Outputs: Draft[] with source refs
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    SQLite DB     │  ~/.social-rig/data.db
│                  │  Stores: drafts, variants, calendar, projects,
│                  │          connectors, activity log
└────────┬────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
┌────────┐ ┌──────────────────┐
│Terminal│ │ Dashboard (web)   │  localhost:3847
│Review  │ │ Review, calendar, │
│(CLI)   │ │ config, plugins,  │
│        │ │ projects, stats   │
└───┬────┘ └────────┬─────────┘
    │               │
    └───────┬───────┘
            ▼
┌─────────────────┐
│     Export       │  Markdown files, JSON, clipboard
└─────────────────┘
```

## Key Types

```typescript
interface ProjectProfile {
  name: string
  description: string
  languages: string[]
  frameworks: string[]
  recentChanges: RepoChange[]      // commits, releases, PRs
  features: GroundedFact[]         // extracted from README/docs
  stats: RepoStats                 // stars, contributors, age
  techStack: string[]
}

interface GroundedFact {
  claim: string                    // "Supports OAuth 2.0"
  source: string                   // "README.md, line 45"
  confidence: "explicit" | "inferred"
}

interface ContentPlan {
  items: PlannedContent[]
}

interface PlannedContent {
  type: ContentType                // feature_highlight, release, tip, etc.
  framework: CopyFramework         // PAS, AIDA, BAB
  angle: string                    // "pain point: manual posting"
  targetPlatforms: Platform[]
  sourceFacts: GroundedFact[]
}

interface Draft {
  id: string
  content: PlatformVariant[]       // one per target platform
  sourceFacts: GroundedFact[]      // what repo facts back this
  framework: CopyFramework
  status: "pending" | "approved" | "rejected"
}

interface PlatformVariant {
  platform: Platform
  headline?: string
  body: string
  hashtags: string[]
  cta?: string
  charCount: number
}
```

## AI Provider Interface

```typescript
interface AIProvider {
  name: string
  generateDrafts(plan: PlannedContent, profile: ProjectProfile, config: VoiceConfig): Promise<Draft>
  regenerate(draft: Draft, feedback: string): Promise<Draft>
}
```

All providers implement the same interface. User picks via config. No vendor lock-in.

## AI Provider Auto-Detection

Social Rig auto-detects existing AI provider keys from the user's system. Zero config for devs who already use AI tools.

```typescript
interface DetectedProvider {
  name: string
  source: string           // "env:OPENAI_API_KEY" | "cursor:config" | "ollama:local"
  model?: string
  apiKey?: string          // resolved at runtime, never stored
  isLocal: boolean
}

const DETECTION_ORDER = [
  "project_config",        // .social-rig/config.yaml
  "env_vars",              // OPENAI_API_KEY, ANTHROPIC_API_KEY
  "copilot_cli",           // ~/.copilot/config.json
  "cursor",                // ~/.cursor/ config
  "aider",                 // ~/.aider.conf.yml
  "continue",              // ~/.continue/config.json
  "claude_cli",            // ~/.claude/ or ~/.config/claude/
  "github_models",         // GITHUB_TOKEN → GitHub Models API
  "ollama_local",          // http://localhost:11434
]

function detectProviders(): DetectedProvider[]
```

Keys are read at runtime, never copied. Config stores the source reference: `api_key_source: "env:OPENAI_API_KEY"`.

## Image Generation

```typescript
interface ImageGenerator {
  name: string
  generate(prompt: ImagePrompt, config: ImageConfig): Promise<GeneratedImage>
}

interface ImagePrompt {
  type: "og_card" | "feature_visual" | "abstract_mood"
  headline?: string
  description: string
  brandColors: { primary: string; background: string }
  style: string
}

interface GeneratedImage {
  url?: string
  buffer: Buffer
  format: "png" | "webp"
  width: number
  height: number
}
```

Providers: OpenAI DALL-E 3, Stability AI, local Stable Diffusion. Optional. Posts work without images.

## Connector Plugin Interface

```typescript
interface CapabilityFlags {
  supports_threads: boolean
  supports_article: boolean
  supports_scheduling: boolean
  supports_analytics: boolean
  supports_media: boolean
  supports_draft_update: boolean
  supports_carousel: boolean
  max_length: number
}

interface ConnectorPlugin {
  id: string
  name: string
  capabilities: CapabilityFlags
  auth(config: AuthConfig): Promise<AuthResult>
  validate(credentials: Credentials): Promise<boolean>
  publish(draft: PlatformVariant, credentials: Credentials): Promise<PublishResult>
  status?(postId: string): Promise<PostStatus>
  analytics?(postId: string): Promise<PostAnalytics>
}
```

Builtin: X, LinkedIn, Dev.to, Hashnode. Community plugins installable via `npx social-rig plugin add <name>`.

## Multi-Project Workspace

```typescript
interface Workspace {
  projects: WorkspaceProject[]
  defaultProject?: string
}

interface WorkspaceProject {
  name: string
  repo: string             // local path or GitHub URL
  configPath: string       // path to .social-rig/config.yaml
}
```

Stored at `~/.social-rig/workspace.yaml`. CLI supports `--project <name>` and `--all` flags.

## SQLite Data Layer

All operational data lives in `~/.social-rig/data.db`. Config stays in YAML (git-committable). Workspace YAML syncs bidirectionally with the `projects` table.

```typescript
interface DraftRow {
  id: string
  project_id: string
  content_type: ContentType
  framework: CopyFramework
  status: "pending" | "approved" | "rejected" | "published"
  source_facts_json: string
  image_path?: string
  created_at: string
  updated_at: string
  reviewed_at?: string
  scheduled_at?: string
}

interface DraftVariantRow {
  id: string
  draft_id: string
  platform: Platform
  headline?: string
  body: string
  hashtags_json: string
  cta?: string
  char_count: number
  published_at?: string
  published_url?: string
  published_id?: string
}

interface CalendarEntryRow {
  id: string
  draft_id: string
  project_id: string
  platform: Platform
  scheduled_at: string
  status: "scheduled" | "published" | "missed" | "cancelled"
  created_at: string
}

interface ActivityLogRow {
  id: number
  project_id?: string
  action: string
  details_json: string
  created_at: string
}
```

Migration strategy: auto-run on first access. Each migration is a numbered SQL file applied in order. `better-sqlite3` handles this synchronously.

## Dashboard Server

Bundled Hono HTTP server serving a pre-built React SPA with REST API.

```typescript
interface DashboardConfig {
  port: number
  openBrowser: boolean
  dbPath: string
}

interface DashboardStats {
  drafts: { pending: number; approved: number; published: number; rejected: number }
  projects: number
  connectors: number
  recentActivity: ActivityLogRow[]
  upcoming: CalendarEntryRow[]
}
```

API routes follow REST conventions. All endpoints read/write SQLite. Frontend is built at npm publish time and served as static assets from the bundled `dist/` directory.

Pages: Dashboard (home), Drafts (review/edit/approve), Calendar (schedule/visualize), Config (edit project settings), Plugins (connector management), Projects (workspace overview).

## Content Quality Rules (enforced in generator)

1. Every feature claim must link to a GroundedFact
2. Banned phrases list from config (default: "excited to announce", "game-changer", etc.)
3. Platform char limits enforced per variant
4. No more than 3 hashtags per post (configurable)
5. CTA must be actionable ("try it" not "check it out maybe")
6. Tone consistency checked against voice config

## Config Schema

```yaml
# .social-rig/config.yaml
project:
  name: "my-project"
  repo: "."                        # local path or GitHub URL
  description: "optional override"

voice:
  tone: "witty-technical"
  audience: "indie developers"
  avoid:
    - "excited to announce"
    - "game-changer"

ai:
  provider: "auto"                 # "auto" = detect from system, or explicit
  model: "gpt-4o"
  api_key_source: "env:OPENAI_API_KEY"  # source ref, not the key itself

images:
  enabled: true
  provider: "openai"               # openai | stability | local
  api_key_source: "env:OPENAI_API_KEY"
  style: "minimal-tech"
  brand_colors:
    primary: "#6366f1"
    background: "#0f172a"

content:
  types:
    - feature_highlight
    - release_announcement
    - dev_tip
  batch_size: 5
  platforms:
    - x
    - linkedin
  blog_target: "devto"             # where long-form publishes first

connectors:
  builtin:
    - x
    - linkedin
    - devto
  community:                       # installed via `npx social-rig plugin add`
    - "@social-rig/connector-reddit"
```

```yaml
# ~/.social-rig/workspace.yaml (multi-project)
projects:
  - name: "social-rig"
    repo: "~/development/docker/social-rig"
  - name: "copilot-notifier"
    repo: "https://github.com/godilite/copilot-notifier"
  - name: "acctally"
    repo: "~/development/docker/invoice-pro"
default_project: "social-rig"
```

## Security Controls

- `.social-rig/ignore` file excludes paths from analysis (like .gitignore)
- Secrets detected in extracted content are redacted automatically
- AI API keys read from env vars, never stored in config files
- `project-profile.yaml` written to disk for user review before generation
- No telemetry, no phone-home, no data retention
