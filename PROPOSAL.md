# Social Rig - Project Proposal

> Turn your repo into a marketing machine.

Social Rig analyzes your software project (local or remote), extracts features, changelogs, and selling points, then generates human-quality marketing content and publishes it across social media and blogs on autopilot.

Built for developers who'd rather ship code than write LinkedIn posts.

## The Problem

Developers build great software but are terrible at marketing it. The options today are:

1. **Do nothing.** Most devs. Great product, zero awareness.
2. **Generic AI tools** (Buffer, Hootsuite, Typefully). They don't understand your codebase. You still write everything yourself.
3. **Hire a marketer.** Expensive. They don't understand your code either.

Nobody has built a tool that reads your repo, understands your product, and generates grounded marketing content that sounds human.

## The Solution

```bash
npx social-rig init          # point at your repo, configure voice/audience
npx social-rig generate      # generate a batch of content from repo analysis
npx social-rig review        # review/edit drafts in terminal or browser
npx social-rig publish       # publish approved content
npx social-rig calendar      # view upcoming content schedule
npx social-rig connect x     # connect social accounts
```

Social Rig does three things:

1. **Understands your project.** Reads code, README, changelogs, commits, issues, releases. Extracts real features and facts.
2. **Writes like a human copywriter.** Uses proven frameworks (PAS, AIDA, BAB). No emoji spam, no "excited to announce", no corporate AI slop.
3. **Publishes everywhere.** LinkedIn, X/Twitter, Dev.to, Hashnode, Medium, Ghost, WordPress, and more.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     social-rig monorepo                  │
├──────────────────────────────┬──────────────────────────┤
│   cli/                       │   engine/ (Phase 4+)     │
│   Node.js                    │   Go                     │
│   ├── CLI commands           │   API + workers          │
│   ├── SQLite DB              │                          │
│   └── Dashboard (localhost)  │                          │
│       ├── Hono API server    │                          │
│       └── React SPA          │                          │
├──────────────────────────────┴──────────────────────────┤
│   connectors/                                            │
│   Platform adapters (X, LinkedIn, Dev.to, Hashnode...)   │
└─────────────────────────────────────────────────────────┘
```

### Why this structure?

| Component | Stack | Why | When |
|-----------|-------|-----|------|
| **CLI** | Node.js/TypeScript | `npx` = zero-friction distribution for devs | Phase 1 |
| **Dashboard** | React + Hono (bundled in CLI) | `npx social-rig dashboard` = instant localhost UI | Phase 1 |
| **SQLite** | better-sqlite3 | Embedded, zero config, one file for all data | Phase 1 |
| **Engine** | Go | Hosted API, scheduling, queue processing, single binary | Phase 4+ |

### Critical design principle: CLI-first, self-contained

The CLI must be a real product on its own. No Docker, no running service, no cloud account required for core functionality.

**What works without the engine:**
- Repo analysis and feature extraction
- Content generation (drafts)
- Review and editing
- Export to markdown/JSON/clipboard

**What requires the engine (optional):**
- Scheduled publishing
- Content calendar with time slots
- Analytics and performance tracking
- Team collaboration
- Webhook-driven generation (new release triggers content)

## Content Pipeline

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Analyze  │───▶│ Strategize│───▶│ Generate │───▶│  Review  │───▶│ Publish  │
│  Repo     │    │  Content  │    │  Drafts  │    │  + Edit  │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
     │                │               │               │               │
  commits         content map     grounded        human gate      connectors
  releases        frameworks      drafts with     (mandatory)     (platform
  README          audience        source refs                      adapters)
  features        tone/voice
```

### Stage 1: Analyze Repo

Extracts structured facts from:
- Git log (recent commits, release tags, contributor activity)
- README and docs (project description, features, quick start)
- Package manifests (package.json, go.mod, Cargo.toml, etc.)
- Changelog files (CHANGELOG.md, RELEASES.md)
- GitHub API (releases, issues, stars, PRs) for remote repos
- Code structure (languages, frameworks, tech stack detection)

Output: a `project-profile.yaml` with grounded facts. No hallucination possible because every claim traces to a source.

### Stage 2: Content Strategy

Using the project profile + user config (voice, audience, goals):
- Selects content types: launch post, feature highlight, devlog, tip, behind-the-scenes, comparison, tutorial teaser, milestone celebration
- Applies copywriting frameworks:
  - **PAS** (Problem-Agitate-Solution) for pain-point posts
  - **AIDA** (Attention-Interest-Desire-Action) for feature launches
  - **BAB** (Before-After-Bridge) for transformation stories
- Generates a content map (what to post, when, which platform)

### Stage 3: Generate Drafts

Each draft includes:
- The content (headline, body, CTA, hashtags)
- Platform-specific variants (X thread vs LinkedIn article vs Dev.to post)
- **Source grounding**: which commits/features/facts informed this draft
- Regeneration hints (swap headline, try different angle, shorter version)

Content quality rules (enforced, not suggested):
- No "excited to announce" or "game-changer"
- No emoji walls
- No unverifiable claims
- Every feature mentioned must trace to repo evidence
- Tone matches configured voice (technical, casual, professional, witty)

### Stage 4: Review Gate (mandatory)

**Auto-publish is opt-in, never default.** Every piece of content must pass through review:

- Terminal review: `npx social-rig review` shows drafts one by one, approve/edit/reject/regenerate
- Web review (with dashboard): visual editor with preview per platform
- Batch approve: `npx social-rig publish --approved` for reviewed content only

### Stage 5: Publish

Connectors handle platform-specific publishing:

**Social connectors:**
- X/Twitter (posts, threads, polls)
- LinkedIn (posts, articles, company pages)
- Bluesky
- Mastodon
- Reddit (subreddit posts)

**Blog connectors:**
- Dev.to (API, returns canonical URL)
- Hashnode (GraphQL API, custom domain support)
- Medium (API, limited)
- Ghost (Admin API)
- WordPress (REST API)
- Custom (user provides endpoint spec)

**Campaign linking:** When a blog article is published, its URL is automatically injected into pending social posts that reference the same content. If no blog URL exists, social posts publish without it. Blog URLs are optional enrichment, never a hard blocker.

## Connector Architecture

Two-layer model to handle platform differences cleanly:

```
┌─────────────────────────────────────────────────┐
│              Connector Interface                 │
├─────────────────────────────────────────────────┤
│  auth()          - OAuth/API key setup           │
│  validate()      - test connection               │
│  publish(draft)  - send content                  │
│  status(id)      - check post status             │
├─────────────────────────────────────────────────┤
│              Capability Flags                    │
├─────────────────────────────────────────────────┤
│  supports_threads      bool                      │
│  supports_article      bool (long-form)          │
│  supports_scheduling   bool                      │
│  supports_analytics    bool                      │
│  supports_media        bool (images/video)       │
│  supports_draft_update bool (edit after publish)  │
│  supports_carousel     bool                      │
│  max_length            int (chars)               │
└─────────────────────────────────────────────────┘
```

The content generator reads capability flags to produce platform-appropriate variants. No lowest-common-denominator output.

## Configuration

```yaml
# .social-rig/config.yaml (created by `npx social-rig init`)
project:
  name: "social-rig"
  repo: "https://github.com/godilite/social-rig"
  description: "AI marketing tool for developers"

voice:
  tone: "witty-technical"      # witty-technical | professional | casual | founder
  audience: "indie developers and startup founders"
  avoid:
    - "excited to announce"
    - "game-changer"
    - "revolutionary"
    - "leveraging AI"

schedule:
  posts_per_week: 5
  preferred_times:
    - "09:00 UTC"
    - "14:00 UTC"
    - "18:00 UTC"
  platforms:
    - x
    - linkedin
    - devto

content:
  types:
    - feature_highlight
    - release_announcement
    - dev_tip
    - behind_the_scenes
    - tutorial_teaser
  blog_target: "devto"         # where long-form publishes first
```

## Security and Privacy

This is critical for adoption. The tool inspects codebases and generates public content.

**Local-first by default:**
- All repo analysis happens locally (git log, file reads)
- Code content is sent to AI provider only for generation (not stored)
- Users choose their own AI provider (OpenAI, Anthropic, local models)

**Explicit controls:**
- `.social-rig/ignore` file (like .gitignore) excludes sensitive paths
- `project-profile.yaml` shows exactly what facts were extracted. User reviews before generation.
- Secret/credential detection and automatic redaction
- No telemetry without opt-in
- No repo content stored on hosted engine (stateless processing)

**AI provider flexibility:**
```yaml
ai:
  provider: "openai"           # openai | anthropic | ollama | custom
  model: "gpt-4o"
  api_key_env: "OPENAI_API_KEY"  # reads from env, never stored in config
```

## Phased Roadmap

### Phase 1: Draft Generator (MVP v1)
**Goal:** "npx social-rig generate" produces genuinely good marketing drafts, with a full localhost dashboard for managing everything.

- CLI scaffolding and config system
- Local repo analyzer (git, files, package manifests)
- Project profile generator
- Content strategy engine (frameworks, content types)
- Draft generator with source grounding
- Terminal review workflow (approve/edit/reject/regenerate)
- Export: markdown, JSON, clipboard
- AI provider integration (OpenAI, Anthropic)
- SQLite data layer (all drafts, calendar, projects, activity)
- Localhost web dashboard (`npx social-rig dashboard`)
  - Drafts page: review, edit, approve/reject
  - Calendar page: visual scheduling
  - Config page: edit project settings in browser
  - Plugins page: connector management
  - Projects page: multi-project workspace
  - Dashboard home: stats, recent activity, quick actions

**Success metric:** A developer runs it on their repo, gets 5 posts they'd actually use, and manages everything from a beautiful localhost dashboard.

### Phase 2: First Social Connector
**Goal:** Publish directly to one platform.

- OAuth flow for X/Twitter (or LinkedIn, user's choice)
- Publishing with media support
- Rate limit handling and retry logic
- Post status tracking
- `npx social-rig publish` workflow

### Phase 3: Blog + Campaign Linking
**Goal:** Long-form content that social posts link to.

- Dev.to connector (best API, instant audience)
- Hashnode connector (custom domain SEO)
- Article generation (long-form from same source material)
- Campaign linking (blog URL injected into social variants)
- Second social connector

### Phase 4: Engine + Calendar
**Goal:** Scheduled, automated content pipeline.

- Go engine with REST API
- Content calendar with scheduling
- Cron-based publishing
- Multiple social connectors active
- GitHub webhook integration (new release triggers content)
- Docker Compose for self-hosting

### Phase 5: Analytics + Strategy Memory
**Goal:** Performance feedback loop and continuous improvement.

- Performance tracking per post/platform
- Strategy memory (what angles work for this repo/audience)
- Content novelty/dedupe checks
- Team collaboration features
- A/B testing for content variants

## Tech Stack Summary

| Layer | Tech | Rationale |
|-------|------|-----------|
| CLI | Node.js + TypeScript | npx distribution, huge ecosystem |
| Dashboard | React + Vite (bundled in CLI) | Pre-built at publish, served from localhost |
| Dashboard API | Hono | 14KB, fast, embedded in CLI binary |
| Engine | Go | Performance, single binary, Docker-friendly (Phase 4+) |
| AI | OpenAI / Anthropic / Ollama | User's choice, no vendor lock-in |
| Database | SQLite via better-sqlite3 | Embedded, zero config, single file |
| Queue | Go channels (local) / Redis (hosted) | Progressive complexity |
| Auth | OAuth 2.0 per platform | Standard social platform auth |

## Dogfooding Strategy

Social Rig will be the first project marketed by Social Rig.

1. Build Phase 1
2. Run `npx social-rig init` on the social-rig repo itself
3. Generate launch content
4. Manually post it (Phase 1 has no auto-publish)
5. Document the entire process as a case study
6. Use that case study as the first blog article
7. When Phase 2 lands, automate the ongoing content

This proves the tool works and generates organic attention from the dev community who loves "built with itself" stories.

## Competitive Positioning

```
                    Understands Code
                         │
                    ┌────┴────┐
                    │Social Rig│  ← only player here
                    └────┬────┘
                         │
        Generic AI ──────┼────── Code-Aware AI
                         │
           ┌─────────────┼─────────────┐
           │             │             │
        Buffer      Typefully      (nothing)
        Hootsuite   FeedHive
        Ocoya       Taplio
           │             │
           └─────┬───────┘
                 │
           No Code Context
```

The moat: nobody else reads your repo. Every other tool starts from a blank text box.

## Repository Structure

```
social-rig/
  cli/                          # Node.js CLI (npx social-rig)
    src/
      commands/                 # init, generate, review, publish, calendar, connect, dashboard
      analyzer/                 # repo analysis (git, files, manifests)
      generator/                # content strategy + draft generation
      connectors/               # platform adapters
      review/                   # terminal review UI (ink or prompts)
      db/                       # SQLite data layer (better-sqlite3)
      dashboard/                # Localhost dashboard server (Hono)
        server.ts               # HTTP server + REST API
        routes/                 # API route handlers
        ui/                     # React SPA (pre-built at publish time)
          src/
            pages/              # Dashboard, Drafts, Calendar, Config, Plugins, Projects
            components/
          dist/                 # Built assets bundled into npm package
          vite.config.ts
    package.json
    tsconfig.json

  engine/                       # Go API (Phase 4+)
    cmd/server/
    internal/
      api/
      scheduler/
      connectors/
      worker/
    go.mod

  dashboard/                    # Next.js (Phase 5+)
    src/
      app/
      components/
    package.json

  connectors/                   # Shared connector specs/schemas
    x.yaml
    linkedin.yaml
    devto.yaml
    hashnode.yaml

  docs/
  .github/
  LICENSE
  README.md
```

## Decisions (Resolved)

### 1. Pricing: BYOK (Bring Your Own Keys) + Free Tier

Social Rig does not charge for AI, social APIs, or image generation. Users bring their own API keys.

**Free tier (self-hosted or CLI):**
- Unlimited generation, publishing, projects
- User provides: AI key (OpenAI/Anthropic/Ollama), social platform OAuth, image gen key
- We provide: the system, the intelligence, the connectors

**Hosted tier (convenience):**
- Free: 50 posts/month, 2 projects, 2 social accounts
- Pro ($19/mo): unlimited posts, unlimited projects, scheduling, analytics, team seats
- Enterprise: custom, self-hosted engine, SSO, audit logs

**What users pay for on hosted:** scheduling infrastructure, analytics storage, team collaboration, and not having to run Docker. Never for AI tokens or API calls.

**Revenue model is pure platform value, not API arbitrage.**

### 2. Connectors: Plugin System

Connectors are community-extensible plugins.

```
social-rig/
  connectors/
    builtin/               # Ships with social-rig
      x.ts
      linkedin.ts
      devto.ts
      hashnode.ts
    community/             # Installable via npx social-rig plugin add
      reddit.ts
      mastodon.ts
      medium.ts
      ghost.ts
```

Plugin interface:
```typescript
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

Plugin discovery:
- `npx social-rig plugin list` shows available community plugins
- `npx social-rig plugin add reddit` installs from npm (`@social-rig/connector-reddit`)
- Plugins registered in `.social-rig/config.yaml` under `connectors`

This lets the community build connectors for Threads, TikTok, Discord, newsletters, etc. without waiting on core releases.

### 3. Image Generation: Yes, BYOK

Social posts with images get 2-3x more engagement. Image gen is included but user brings their own key.

Supported providers:
- OpenAI DALL-E 3 (same key as text generation)
- Stability AI
- Local: Stable Diffusion via API (for privacy-conscious users)

Image types:
- **OG images**: branded cards with headline text overlay for blog links
- **Feature visuals**: diagrams, screenshots, code snippets as images
- **Abstract/mood**: thematic visuals matching post tone

Image generation is optional. Posts without images still work. Config:

```yaml
images:
  enabled: true
  provider: "openai"        # openai | stability | local
  api_key_env: "OPENAI_API_KEY"
  style: "minimal-tech"     # minimal-tech | vibrant | dark-mode | custom
  brand_colors:
    primary: "#6366f1"
    background: "#0f172a"
```

### 4. Multi-Project Support: Yes

One social-rig install manages content for multiple repos/products.

```yaml
# ~/.social-rig/workspace.yaml
projects:
  - name: "social-rig"
    repo: "~/development/docker/social-rig"
    config: ".social-rig/config.yaml"
  - name: "copilot-notifier"
    repo: "https://github.com/godilite/copilot-notifier"
    config: ".social-rig/config.yaml"
  - name: "acctally"
    repo: "~/development/docker/invoice-pro"
    config: ".social-rig/config.yaml"
```

CLI support:
```bash
npx social-rig generate --project social-rig
npx social-rig generate --all              # batch across all projects
npx social-rig calendar                     # unified calendar, all projects
npx social-rig status                       # dashboard across projects
```

Each project has its own voice, audience, and content strategy. Social accounts can be shared or per-project.

### 5. BYOK Philosophy: Users Own Everything

Social Rig is infrastructure, not a middleman. The user owns all their keys, data, and accounts.

```
What users bring:                    What Social Rig provides:
─────────────────                    ────────────────────────
AI keys (OpenAI/Anthropic/Ollama)    Repo analysis engine
Social OAuth tokens (X/LinkedIn)     Content strategy intelligence
Blog API keys (Dev.to/Hashnode)      Copywriting frameworks
Image gen keys (DALL-E/Stability)    Platform-aware generation
                                     Review workflow
                                     Scheduling system
                                     Plugin ecosystem
                                     Multi-project management
```

No vendor lock-in. Switch AI providers, switch social platforms, self-host everything. Your keys, your data, your content.

### 6. Zero-Config AI: Auto-Detect Existing Providers

Most developers already have AI provider keys configured on their machines for Copilot, Cursor, Aider, Continue, or direct API use. Social Rig should detect and reuse them automatically. No setup required if you're already using AI tools.

**Auto-detection priority (checked in order):**

```
1. Project config        .social-rig/config.yaml → ai.api_key_env
2. Environment vars      OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.
3. Copilot CLI           ~/.copilot/config.json (model preference)
4. Cursor                ~/.cursor/ config files
5. Aider                 ~/.aider.conf.yml → api_key fields
6. Continue              ~/.continue/config.json → models[].apiKey
7. Claude CLI            ~/.claude/ config
8. GitHub Models         GITHUB_TOKEN (GitHub Models API)
9. Local Ollama          http://localhost:11434 (auto-detect running instance)
```

**Init experience with auto-detection:**

```
$ npx social-rig init

  Scanning for AI providers...
  Found:
    ✔ OpenAI (from OPENAI_API_KEY env var)
    ✔ Anthropic (from ~/.config/claude/ config)
    ✔ Ollama (running at localhost:11434, models: llama3, mistral)

  ? Which provider for content generation?
    ❯ OpenAI GPT-4o (detected)
      Anthropic Claude Sonnet (detected)
      Ollama llama3 (local, free)
      Enter a different key manually
```

**How it works in code:**

```typescript
interface DetectedProvider {
  name: string
  source: string           // "env:OPENAI_API_KEY" | "cursor:config" | "ollama:local"
  model?: string
  apiKey?: string          // resolved, never stored
  isLocal: boolean
}

function detectProviders(): DetectedProvider[] {
  return [
    ...detectEnvVars(),        // OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.
    ...detectCopilotCLI(),     // ~/.copilot/
    ...detectCursor(),         // ~/.cursor/
    ...detectAider(),          // ~/.aider.conf.yml
    ...detectContinue(),       // ~/.continue/
    ...detectClaude(),         // ~/.claude/ or ~/.config/claude/
    ...detectOllama(),         // ping localhost:11434
  ]
}
```

**Rules:**
- Keys are read at runtime, never copied or stored in social-rig config
- Config stores the source reference, not the key: `api_key_source: "env:OPENAI_API_KEY"`
- User can always override with explicit key in project config
- Local models (Ollama) are preferred when detected, since they're free
- If nothing is found, prompt the user to enter a key manually
