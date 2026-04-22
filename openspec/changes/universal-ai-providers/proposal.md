# Universal AI Provider Detection

## Problem

social-rig detects local AI tools (claude-cli, copilot, etc.) during init but cannot actually use them for content generation. Users who already have AI tools installed and authenticated are forced to manually configure API keys, defeating the "zero friction" promise.

## Proposed Solution

Build a universal provider system that can use any local AI tool the user already has. Three provider strategies:

1. **Subprocess CLIs**: Shell out to installed CLI tools (claude, gemini, codex, goose, opencode, etc.)
2. **Local servers**: HTTP calls to OpenAI-compatible local servers (Ollama, LM Studio, Jan, LocalAI, GPT4All, Tabby, llama.cpp)
3. **Config parasitism**: Read API keys from other tools' config files (Aider, Continue, Cody, OpenCode)

Plus: provider switching at any time via CLI command, generate flag, or dashboard UI.

## Detection Strategy

Dual-phase detection:
- **Eager** at `social-rig init` to show all available options
- **Lazy** at `social-rig generate` to pick up newly installed tools

### Subprocess CLIs

| CLI | Command | Detection |
|-----|---------|-----------|
| Claude | `claude --print -p "..."` | `which claude` + `~/.claude/` |
| Gemini | `gemini -p "..."` | `which gemini` |
| Codex | `codex --quiet -p "..."` | `which codex` |
| Copilot | `gh copilot` | `gh extension list` |
| Goose | `goose run` | `which goose` + `~/.config/goose/` |
| OpenCode | `opencode` | `which opencode` + `~/.opencode/` |
| Aider | wraps API keys | `which aider` + `~/.aider.conf.yml` |
| Open Interpreter | `interpreter` | `which interpreter` |

### Local Servers (OpenAI-compatible)

| Server | Default Port | Endpoint |
|--------|-------------|----------|
| Ollama | 11434 | `/api/generate` |
| LM Studio | 1234 | `/v1/chat/completions` |
| Jan | 1337 | `/v1/chat/completions` |
| LocalAI | 8080 | `/v1/chat/completions` |
| GPT4All | 4891 | `/v1/chat/completions` |
| Tabby | 8080 | `/v1/chat/completions` |
| llama.cpp | 8080 | `/completion` |

### Config Parasites

| Tool | Config Path | Extracts |
|------|-------------|----------|
| Aider | `~/.aider.conf.yml` | API keys, model preferences |
| Continue | `~/.continue/config.json` | Provider configs, API keys |
| Cody | `~/.sourcegraph/` | Sourcegraph token |
| OpenCode | `~/.opencode/config.json` | Provider configs, API keys |

### Cloud APIs (direct, needs keys)

| Provider | Env Var | Default Model |
|----------|---------|---------------|
| OpenAI | `OPENAI_API_KEY` | gpt-4o |
| Anthropic | `ANTHROPIC_API_KEY` | claude-sonnet-4-20250514 |
| Google | `GOOGLE_API_KEY` | gemini-2.0-flash |

## Provider Switching

### CLI Commands

```bash
social-rig provider list          # Show all detected providers
social-rig provider switch <name> # Switch active provider
social-rig provider test          # Test current provider connection
social-rig generate --provider X  # One-off override for this run
```

### Dashboard

Config page gets a provider section: dropdown of detected providers, model selector, and test connection button. Changes write to config.yaml.

### Config Format

```yaml
ai:
  provider: claude-cli
  model: claude-sonnet-4-20250514
  fallback: ollama
  apiKeySource: ""
```

## Implementation Tiers

### Tier 1 (highest value)
- Claude CLI subprocess provider
- Gemini CLI subprocess provider
- Codex CLI subprocess provider
- OpenCode CLI/config provider
- Re-detection at generate time (lazy scan)
- `provider list/switch/test` CLI commands

### Tier 2 (one class covers many)
- `OpenAICompatibleProvider` for local servers
- Port scanning for LM Studio, Jan, LocalAI, GPT4All
- Ollama refactored to use same base

### Tier 3 (config parasitism)
- Aider config parser (YAML)
- Continue config parser (JSON)
- OpenCode config parser

### Tier 4 (polish)
- Dashboard provider switching UI
- `--provider` flag on generate
- Fallback chain (if primary fails, try next)
- Goose, Open Interpreter, Copilot (gh extension)

## Non-Goals

- Building our own model hosting
- Supporting paid API proxies (OpenRouter, etc.) in this phase
- Model fine-tuning or custom prompts per provider

## Success Criteria

- User with only Claude CLI installed can run `social-rig init && social-rig generate` with zero API key configuration
- `social-rig provider list` shows every available AI tool on the system
- Switching providers is instant and persisted
