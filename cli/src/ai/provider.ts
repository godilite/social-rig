export interface AIProvider {
  name: string
  generate(prompt: string, systemPrompt: string): Promise<string>
}

function resolveApiKey(apiKeySource: string): string {
  if (apiKeySource.startsWith("env:")) {
    const envVar = apiKeySource.slice(4)
    const value = process.env[envVar]
    if (!value) throw new Error(`Environment variable ${envVar} is not set`)
    return value
  }

  if (apiKeySource.startsWith("$")) {
    const envVar = apiKeySource.slice(1)
    const value = process.env[envVar]
    if (!value) throw new Error(`Environment variable ${envVar} is not set`)
    return value
  }

  const value = process.env[apiKeySource]
  if (value) return value

  return apiKeySource
}

const CLI_PROVIDER_FACTORIES: Record<string, () => Promise<AIProvider>> = {
  "claude-cli": async () => {
    const { createClaudeCliProvider } = await import("./claude-cli.js")
    return createClaudeCliProvider()
  },
  "gemini-cli": async () => {
    const { createGeminiCliProvider } = await import("./gemini-cli.js")
    return createGeminiCliProvider()
  },
  "codex-cli": async () => {
    const { createCodexCliProvider } = await import("./codex-cli.js")
    return createCodexCliProvider()
  },
  "opencode-cli": async () => {
    const { createOpenCodeCliProvider } = await import("./opencode-cli.js")
    return createOpenCodeCliProvider()
  },
  "goose-cli": async () => {
    const { createGooseCliProvider } = await import("./goose-cli.js")
    return createGooseCliProvider()
  },
  "interpreter-cli": async () => {
    const { createInterpreterCliProvider } = await import("./interpreter-cli.js")
    return createInterpreterCliProvider()
  },
}

const LOCAL_SERVER_FACTORIES: Record<string, (model: string) => Promise<AIProvider>> = {
  "lm-studio": async (model) => {
    const { createLMStudioProvider } = await import("./openai-compat.js")
    return createLMStudioProvider(model)
  },
  jan: async (model) => {
    const { createJanProvider } = await import("./openai-compat.js")
    return createJanProvider(model)
  },
  localai: async (model) => {
    const { createLocalAIProvider } = await import("./openai-compat.js")
    return createLocalAIProvider(model)
  },
  gpt4all: async (model) => {
    const { createGPT4AllProvider } = await import("./openai-compat.js")
    return createGPT4AllProvider(model)
  },
}

export async function createProvider(config: {
  provider: string
  model: string
  apiKeySource: string
}): Promise<AIProvider> {
  const { provider, model, apiKeySource } = config

  if (CLI_PROVIDER_FACTORIES[provider]) {
    return CLI_PROVIDER_FACTORIES[provider]()
  }

  if (LOCAL_SERVER_FACTORIES[provider]) {
    return LOCAL_SERVER_FACTORIES[provider](model)
  }

  switch (provider) {
    case "openai": {
      const { OpenAIProvider } = await import("./openai.js")
      return new OpenAIProvider(resolveApiKey(apiKeySource), model)
    }
    case "anthropic": {
      const { AnthropicProvider } = await import("./anthropic.js")
      return new AnthropicProvider(resolveApiKey(apiKeySource), model)
    }
    case "google": {
      const { OpenAIProvider } = await import("./openai.js")
      return new OpenAIProvider(
        resolveApiKey(apiKeySource),
        model || "gemini-2.0-flash",
        "https://generativelanguage.googleapis.com",
      )
    }
    case "ollama": {
      const { OllamaProvider } = await import("./ollama.js")
      return new OllamaProvider(model)
    }
    case "auto": {
      return await autoDetectProvider(model)
    }
    default: {
      if (provider.includes("(via ")) {
        return await createParasitedProvider(provider, model)
      }
      return await autoDetectProvider(model)
    }
  }
}

async function createParasitedProvider(providerName: string, model: string): Promise<AIProvider> {
  const { extractParasitedCredentials } = await import("./parasite.js")
  const creds = await extractParasitedCredentials()

  const match = creds.find((c) => providerName.includes(c.provider) && providerName.includes(c.source))
  if (!match) throw new Error(`No credentials found for ${providerName}`)

  if (match.provider === "openai") {
    const { OpenAIProvider } = await import("./openai.js")
    return new OpenAIProvider(match.apiKey, model || match.model || "gpt-4o")
  }

  if (match.provider === "anthropic") {
    const { AnthropicProvider } = await import("./anthropic.js")
    return new AnthropicProvider(match.apiKey, model || match.model || "claude-sonnet-4-20250514")
  }

  throw new Error(`Unsupported parasited provider type: ${match.provider}`)
}

async function autoDetectProvider(preferredModel: string): Promise<AIProvider> {
  const { detectProviders } = await import("./detect.js")
  const providers = await detectProviders(true)

  for (const p of providers) {
    if (p.type === "cli") {
      if (CLI_PROVIDER_FACTORIES[p.name]) {
        return CLI_PROVIDER_FACTORIES[p.name]()
      }
    }

    if (p.type === "server") {
      if (p.name === "ollama") {
        const { OllamaProvider } = await import("./ollama.js")
        return new OllamaProvider(preferredModel || p.model || "llama3")
      }
      if (LOCAL_SERVER_FACTORIES[p.name]) {
        return LOCAL_SERVER_FACTORIES[p.name](preferredModel || p.model || "default")
      }
    }

    if ((p.type === "cloud" || p.type === "parasited") && p.apiKey) {
      if (p.name.includes("openai") || p.name.includes("openai")) {
        const { OpenAIProvider } = await import("./openai.js")
        return new OpenAIProvider(p.apiKey, preferredModel || p.model || "gpt-4o")
      }
      if (p.name.includes("anthropic")) {
        const { AnthropicProvider } = await import("./anthropic.js")
        return new AnthropicProvider(p.apiKey, preferredModel || p.model || "claude-sonnet-4-20250514")
      }
    }
  }

  throw new Error(
    "No AI provider detected. Install a CLI (claude, gemini, codex), start a local server (Ollama, LM Studio), or set an API key (OPENAI_API_KEY, ANTHROPIC_API_KEY).",
  )
}
