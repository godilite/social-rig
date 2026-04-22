# Phase 1: Draft Generator - Proposal

## Problem

Developers build great software but don't market it. Existing tools (Buffer, Typefully, Hootsuite) don't understand codebases. Developers start from a blank text box every time.

## Solution

A CLI tool that reads your repo, extracts real features and facts, and generates human-quality marketing drafts grounded in actual project data.

```bash
npx social-rig init       # analyze repo, create config
npx social-rig generate   # produce marketing drafts
npx social-rig review     # approve/edit/reject in terminal
npx social-rig dashboard  # open localhost dashboard in browser
```

## Scope

Phase 1 is intentionally narrow. If the drafts aren't good, nothing else matters.

**In scope:**
- CLI scaffolding with init, generate, review, export, dashboard commands
- Local repo analyzer (git log, README, package manifests, changelogs)
- Remote repo analyzer (GitHub API for releases, issues, stars)
- Project profile generator (structured facts from repo)
- Content strategy engine (PAS, AIDA, BAB frameworks)
- Draft generator with source grounding (every claim cites a repo fact)
- Terminal review workflow (approve, edit, reject, regenerate)
- Export to markdown, JSON, clipboard
- AI provider integration (OpenAI, Anthropic, Ollama)
- Config system (.social-rig/config.yaml)
- SQLite data layer (replaces file-based draft storage)
- Localhost web dashboard (React SPA served by bundled Hono server)
  - Drafts: browse, review, edit, approve/reject
  - Calendar: visual scheduling with drag-and-drop
  - Config: edit project settings in browser
  - Plugins: connector management
  - Projects: multi-project workspace overview
  - Home: stats, activity feed, quick actions

**Out of scope (later phases):**
- Social media connectors and publishing
- Blog connectors
- Content calendar scheduling (auto-publish)
- Analytics and performance tracking
- Go engine backend

## Success Criteria

A developer runs `npx social-rig generate` on their repo, gets 5 posts they'd actually use, and manages everything from `npx social-rig dashboard`.
