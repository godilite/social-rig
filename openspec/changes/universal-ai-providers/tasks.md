# Tasks: Universal AI Providers

## Tier 1: Subprocess CLI Providers

### task-1: Subprocess base class
Create `SubprocessProvider` base class in `cli/src/ai/subprocess.ts` that handles spawning a CLI process, capturing stdout, timeout handling (120s), and error wrapping.

### task-2: Claude CLI provider
Implement `ClaudeCliProvider` using subprocess base. Detection: `which claude` + `~/.claude/` exists. Args: `claude --print -p "<system>\n\n<prompt>"`. Test with mock exec.

### task-3: Gemini CLI provider
Implement `GeminiCliProvider` using subprocess base. Detection: `which gemini`. Args: `gemini -p "<prompt>"`. Test with mock exec.

### task-4: Codex CLI provider
Implement `CodexCliProvider` using subprocess base. Detection: `which codex`. Args: `codex --quiet -p "<prompt>"`. Test with mock exec.

### task-5: OpenCode CLI provider
Implement `OpenCodeCliProvider` using subprocess base. Detection: `which opencode` + `~/.opencode/` config. Also parse `~/.opencode/config.json` for API keys as parasite source. Test with mock exec.

### task-6: Goose CLI provider
Implement `GooseCliProvider` using subprocess base. Detection: `which goose` + `~/.config/goose/`. Test with mock exec.

## Tier 2: Local Server Providers

### task-7: OpenAI-compatible base provider
Create `OpenAICompatibleProvider` class that calls `/v1/chat/completions` with configurable baseUrl, model, and optional API key. Handles all OpenAI-compatible local servers.

### task-8: Local server detection
Implement port scanning for known local servers: Ollama (:11434), LM Studio (:1234), Jan (:1337), LocalAI (:8080), GPT4All (:4891). Ping with timeout (2s). Return available servers with their running models.

### task-9: Refactor existing Ollama provider
Refactor existing `ollama.ts` to extend or use `OpenAICompatibleProvider` base. Keep backward compatibility with existing Ollama-specific `/api/generate` endpoint but also support `/v1/chat/completions`.

## Tier 3: Config Parasitism

### task-10: Aider config parser
Parse `~/.aider.conf.yml` for `openai-api-key`, `anthropic-api-key`, `model` fields. Return as parasited provider configs that feed into existing OpenAI/Anthropic providers.

### task-11: Continue config parser
Parse `~/.continue/config.json` for `models[]` array. Extract provider type, API key, and model name. Return as parasited provider configs.

### task-12: OpenCode config parser
Parse `~/.opencode/config.json` for provider configurations and API keys. Return as parasited provider configs.

### task-13: Cody/Sourcegraph config parser
Parse `~/.sourcegraph/` for auth tokens. Return as parasited provider config if Sourcegraph API supports chat completions.

## Tier 4: Detection & Registry

### task-14: Expand detect.ts
Rewrite `detect.ts` to run all three detection strategies (subprocess scan, port scan, config parse) in parallel. Deduplicate providers. Rank by preference: local CLIs > local servers > parasited keys > direct cloud keys. Cache results for 60s.

### task-15: Update provider factory
Update `provider.ts` factory to handle all new provider types. Map detected provider names to their implementation classes.

## Tier 5: CLI Commands

### task-16: Provider list command
Add `social-rig provider list` command. Runs detection, displays table with columns: name, type (local/server/cloud), status (active/available/no-key), model. Highlights current active provider.

### task-17: Provider switch command
Add `social-rig provider switch <name>` command. Validates provider is available, updates config.yaml, runs a test prompt ("respond with OK"), reports success/failure.

### task-18: Provider test command
Add `social-rig provider test` command. Loads current provider, sends test prompt, reports provider name, model, latency, and success/failure.

### task-19: Generate --provider flag
Add `--provider <name>` flag to `social-rig generate`. Uses specified provider for this run only without changing config. Also add `--model <name>` flag.

## Tier 6: Dashboard Integration

### task-20: Provider API routes
Add `/api/providers` GET (list detected), `/api/providers/active` GET (current), `/api/providers/switch` POST (change provider). All routes in `cli/src/dashboard/routes/providers.ts`.

### task-21: Dashboard provider UI
Add provider section to Config page in dashboard. Dropdown of detected providers, model text input, "Test Connection" button, status indicator.

## Tier 7: Polish

### task-22: Fallback chain
Implement provider fallback. If active provider fails, try next available provider in ranked order. Configurable via `ai.fallback` in config.yaml.

### task-23: Open Interpreter provider
Implement `InterpreterProvider` using subprocess base. Detection: `which interpreter`. Lower priority.

### task-24: Tests
Unit tests for: subprocess base (mock exec), detection (mock filesystem + fetch), config parasites (fixture files), provider factory (all cases), provider commands.

### task-25: Re-detection at generate time
Before each generate run, do a quick availability check on the active provider. If unavailable, re-detect and suggest alternatives or auto-fallback.
