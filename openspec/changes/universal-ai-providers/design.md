# Design: Universal AI Providers

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Provider Registry                         │
│                                                               │
│  detect() → scans system → returns AvailableProvider[]        │
│  create(name) → returns AIProvider instance                   │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Subprocess   │  │ HTTP Client  │  │ Config Parasite      │ │
│  │              │  │              │  │                      │ │
│  │ claude-cli   │  │ ollama       │  │ aider → extract key  │ │
│  │ gemini-cli   │  │ lm-studio   │  │ continue → extract   │ │
│  │ codex-cli    │  │ jan         │  │ opencode → extract   │ │
│  │ opencode-cli │  │ localai     │  │ cody → extract       │ │
│  │ goose        │  │ gpt4all     │  │                      │ │
│  │ interpreter  │  │ tabby       │  │ Feeds keys into      │ │
│  │              │  │             │  │ HTTP Client providers │ │
│  └──────┬───────┘  └──────┬──────┘  └──────────┬───────────┘ │
│         │                 │                     │             │
│         └─────────────────┼─────────────────────┘             │
│                           │                                   │
│                    ┌──────┴──────┐                             │
│                    │  AIProvider │                             │
│                    │  interface  │                             │
│                    └─────────────┘                             │
└──────────────────────────────────────────────────────────────┘
```

## AIProvider Interface (unchanged)

```typescript
interface AIProvider {
  name: string
  generate(prompt: string, systemPrompt: string): Promise<string>
}
```

## Detection Flow

```
              social-rig init / generate
                        │
           ┌────────────┼────────────────┐
           ▼            ▼                ▼
      scan PATH     ping ports      read configs
      for CLIs      for servers     for API keys
           │            │                │
           ▼            ▼                ▼
      AvailableProvider[]  (merged, deduplicated)
           │
           ▼
      Rank by preference:
        1. Local CLIs (zero cost to user)
        2. Local servers (zero cost, user controls)
        3. Parasited keys (zero config, uses existing auth)
        4. Direct cloud keys (user explicitly configured)
```

## Subprocess Provider Pattern

All CLI providers share the same base class:

```typescript
class SubprocessProvider implements AIProvider {
  constructor(
    readonly name: string,
    private command: string,
    private buildArgs: (prompt: string, system: string) => string[],
    private parseOutput?: (raw: string) => string,
  ) {}

  async generate(prompt: string, systemPrompt: string): Promise<string> {
    const args = this.buildArgs(prompt, systemPrompt)
    const result = await execAsync(this.command, args, { timeout: 120_000 })
    return this.parseOutput ? this.parseOutput(result.stdout) : result.stdout.trim()
  }
}
```

Each CLI just provides its args builder:

- **claude**: `["--print", "-p", combinedPrompt]`
- **gemini**: `["-p", combinedPrompt]`
- **codex**: `["--quiet", "-p", combinedPrompt]`
- **opencode**: TBD based on CLI interface

## OpenAI-Compatible Provider

Single class handles all local servers:

```typescript
class OpenAICompatibleProvider implements AIProvider {
  constructor(
    readonly name: string,
    private baseUrl: string,
    private model: string,
    private apiKey?: string,
  ) {}

  async generate(prompt: string, systemPrompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    })
    const data = await res.json()
    return data.choices[0].message.content
  }
}
```

## Config Parasitism

```
  ~/.aider.conf.yml          ~/.continue/config.json
         │                            │
         ▼                            ▼
  Parse YAML for:             Parse JSON for:
    openai-api-key              models[].apiKey
    anthropic-api-key           models[].provider
    model                       models[].model
         │                            │
         └────────────┬───────────────┘
                      ▼
              Create matching HTTP provider
              (OpenAI or Anthropic) with
              extracted credentials
```

## Provider Switch Command

```
social-rig provider list
  → detect() all providers
  → display table with name, type, status, model

social-rig provider switch <name>
  → validate provider is available
  → update config.yaml ai.provider + ai.model
  → run test prompt ("say hello in 5 words")
  → confirm success

social-rig provider test
  → load current provider
  → run test prompt
  → report latency and success
```

## File Changes

### New files
- `cli/src/ai/subprocess.ts` (base class)
- `cli/src/ai/claude-cli.ts`
- `cli/src/ai/gemini-cli.ts`
- `cli/src/ai/codex-cli.ts`
- `cli/src/ai/opencode-cli.ts`
- `cli/src/ai/openai-compat.ts` (local servers)
- `cli/src/ai/parasite.ts` (config readers)
- `cli/src/commands/provider.ts`

### Modified files
- `cli/src/ai/detect.ts` (expanded detection)
- `cli/src/ai/provider.ts` (new provider factory cases)
- `cli/src/commands/generate.ts` (--provider flag)
- `cli/src/cli.ts` (register provider command)
- `cli/src/dashboard/routes/` (provider API endpoints)

## Key Decisions

1. **Subprocess timeout**: 120s (AI generation can be slow)
2. **Detection caching**: Cache for 60s during a session, re-scan on explicit list
3. **Fallback chain**: If active provider fails, try next available (configurable)
4. **Model per provider**: Stored in config, auto-suggested on switch
5. **No concurrent providers**: One active at a time, but override per-generate
