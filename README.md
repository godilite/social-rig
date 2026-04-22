# social-rig

> Turn your repo into a marketing machine.

Social Rig reads your codebase, extracts real features and facts, then generates human-quality marketing content grounded in actual project data. No more staring at a blank text box.

## Quick Start

```bash
npx social-rig init
npx social-rig generate
npx social-rig review
npx social-rig dashboard
```

## What it does

1. **Reads your repo.** Git history, README, changelogs, package manifests, GitHub API. Extracts real features and facts.
2. **Writes like a human copywriter.** Uses proven frameworks (PAS, AIDA, BAB). No emoji spam, no "excited to announce", no corporate AI slop.
3. **Generates for every platform.** X (280 chars), LinkedIn (long-form), Dev.to (articles), Hashnode, and more.
4. **Shows you everything.** Localhost dashboard with calendar, draft management, config editor, and project overview.

## Commands

```
social-rig init [repo]          Analyze repo, create config, detect AI providers
social-rig generate             Generate marketing drafts from repo analysis
social-rig generate --count 10  Generate a specific number of drafts
social-rig generate --all       Generate for all workspace projects
social-rig review               Review drafts in terminal (approve/edit/reject)
social-rig export               Export approved drafts to markdown or JSON
social-rig status               Show draft counts across projects
social-rig dashboard            Open the localhost web dashboard
social-rig profile              View or regenerate project profile
social-rig plugin list          Show installed connectors
social-rig plugin add <name>    Install a community connector
```

## Dashboard

Run `npx social-rig dashboard` to open a full web UI at `localhost:3847`:

- **Home**: Stats overview, upcoming calendar, recent activity
- **Drafts**: Browse, review, edit, approve/reject with platform previews
- **Calendar**: Visual content calendar with scheduling
- **Config**: Edit voice, tone, AI provider, platforms in the browser
- **Plugins**: Manage connector plugins
- **Projects**: Multi-project workspace overview

## AI Provider Auto-Detection

Social Rig finds your existing AI keys automatically. No setup needed if you already use:

- OpenAI (from `OPENAI_API_KEY` env var)
- Anthropic (from `ANTHROPIC_API_KEY` or Claude CLI config)
- Ollama (detects running instance at localhost:11434)
- Copilot CLI, Cursor, Aider, Continue (reads their configs)

Keys are read at runtime, never stored. Config saves the source reference only.

## Configuration

Created by `social-rig init` at `.social-rig/config.yaml`:

```yaml
project:
  name: "my-project"
  repo: "."

voice:
  tone: "witty-technical"
  audience: "indie developers"
  avoid:
    - "excited to announce"
    - "game-changer"

ai:
  provider: "auto"
  model: "gpt-4o"
  api_key_source: "env:OPENAI_API_KEY"

content:
  types:
    - feature_highlight
    - release_announcement
    - dev_tip
  batch_size: 5
  platforms:
    - x
    - linkedin
```

## Multi-Project Workspace

Manage content for multiple repos from one install:

```bash
cd ~/project-a && npx social-rig init
cd ~/project-b && npx social-rig init

npx social-rig generate --all
npx social-rig status
```

## Content Quality

Every draft is grounded in real repo data. No hallucination.

- Every feature claim traces to a source (README line, commit, release note)
- Banned phrases are automatically filtered
- Platform character limits are enforced
- Tone consistency is checked against your voice config

## Plugin System

Connectors are extensible. Built-in: X, LinkedIn, Dev.to, Hashnode.

Community plugins installable via npm:

```bash
npx social-rig plugin add reddit
npx social-rig plugin add mastodon
```

## BYOK (Bring Your Own Keys)

Social Rig is infrastructure, not a middleman. You own all your keys and data.

| You bring | Social Rig provides |
|-----------|-------------------|
| AI keys (OpenAI/Anthropic/Ollama) | Repo analysis engine |
| Social OAuth tokens | Content strategy intelligence |
| Blog API keys | Copywriting frameworks |
| Image gen keys (optional) | Platform-aware generation |

## Development

```bash
cd cli
npm install
npm run dev        # watch mode
npm run build      # production build
npm test           # run tests
npm run typecheck  # type checking
```

## License

MIT
