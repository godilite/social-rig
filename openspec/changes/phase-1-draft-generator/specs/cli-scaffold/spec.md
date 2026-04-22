# CLI Scaffold Spec

## Purpose

The CLI is the primary interface for social-rig. It must feel fast, familiar to developers, and work without any external service.

## Package Setup

```json
{
  "name": "social-rig",
  "version": "0.1.0",
  "bin": { "social-rig": "dist/cli.js" },
  "type": "module",
  "engines": { "node": ">=18" }
}
```

Distribution: `npx social-rig` runs without install. `npm install -g social-rig` for frequent users.

## Commands

```
social-rig init [--repo <path|url>]     Create .social-rig/ config (auto-detects AI keys)
social-rig generate [--count N]         Generate N drafts (default: 5)
social-rig generate --project <name>    Generate for a specific project
social-rig generate --all               Generate for all workspace projects
social-rig review                       Interactive review of pending drafts
social-rig export [--format md|json]    Export approved drafts
social-rig status                       Show draft counts by status (all projects)
social-rig profile                      Show/regenerate project profile
social-rig plugin list                  Show available and installed connectors
social-rig plugin add <name>            Install a community connector plugin
social-rig plugin remove <name>         Remove a connector plugin
```

Future commands (not Phase 1):
```
social-rig connect <platform>           OAuth connect to social platform
social-rig publish                      Publish approved drafts
social-rig calendar                     View content calendar
social-rig server                       Start local engine (Phase 4)
```

## Init Flow

```
$ npx social-rig init

  Scanning for AI providers...
  Found:
    ✔ OpenAI (from OPENAI_API_KEY env var)
    ✔ Anthropic (from ~/.config/claude/ config)
    ✔ Ollama (running at localhost:11434, models: llama3)

  Analyzing repository...
  Detected: Node.js project (TypeScript)
  Found: README.md, CHANGELOG.md, package.json

  Project name: social-rig
  Description: AI marketing tool for developers (from package.json)

  ? Target audience: indie developers and startup founders
  ? Tone: witty-technical
  ? AI provider:
    ❯ OpenAI GPT-4o (detected from env)
      Anthropic Claude Sonnet (detected from ~/.config/claude/)
      Ollama llama3 (local, free)
      Enter a different key manually
  ? Platforms: x, linkedin
  ? Enable image generation? Yes (using OpenAI DALL-E)

  Created .social-rig/config.yaml
  Created .social-rig/ignore
  Generated .social-rig/project-profile.yaml
  Registered in workspace (~/.social-rig/workspace.yaml)

  Review your project profile:
    cat .social-rig/project-profile.yaml

  Then generate content:
    npx social-rig generate
```

## Dependencies (minimal)

| Package | Purpose |
|---------|---------|
| commander | CLI framework |
| inquirer | Interactive prompts |
| chalk | Terminal colors |
| yaml | Config parsing |
| openai | OpenAI SDK |
| @anthropic-ai/sdk | Anthropic SDK |
| simple-git | Git operations |
| clipboardy | Clipboard access |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Config not found (run init first) |
| 3 | AI provider error (bad key, rate limit) |
| 4 | No drafts to review/export |

## Global Flags

```
--verbose          Show detailed output
--config <path>    Use alternate config file
--no-color         Disable terminal colors
--json             Output in JSON format (for scripting)
```
