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

export async function createProvider(config: {
  provider: string
  model: string
  apiKeySource: string
}): Promise<AIProvider> {
  const { provider, model, apiKeySource } = config

  switch (provider) {
    case "openai": {
      const { OpenAIProvider } = await import("./openai.js")
      return new OpenAIProvider(resolveApiKey(apiKeySource), model)
    }
    case "anthropic": {
      const { AnthropicProvider } = await import("./anthropic.js")
      return new AnthropicProvider(resolveApiKey(apiKeySource), model)
    }
    case "ollama": {
      const { OllamaProvider } = await import("./ollama.js")
      return new OllamaProvider(model)
    }
    case "auto": {
      return await autoDetectProvider(model)
    }
    default:
      throw new Error(`Unknown AI provider: ${provider}`)
  }
}

async function autoDetectProvider(preferredModel: string): Promise<AIProvider> {
  if (process.env.OPENAI_API_KEY) {
    const { OpenAIProvider } = await import("./openai.js")
    return new OpenAIProvider(process.env.OPENAI_API_KEY, preferredModel || "gpt-4o")
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const { AnthropicProvider } = await import("./anthropic.js")
    return new AnthropicProvider(process.env.ANTHROPIC_API_KEY, preferredModel || "claude-sonnet-4-20250514")
  }

  try {
    const res = await fetch("http://localhost:11434/api/tags", {
      signal: AbortSignal.timeout(2000),
    })
    if (res.ok) {
      const { OllamaProvider } = await import("./ollama.js")
      const data = (await res.json()) as { models?: { name: string }[] }
      const model = data.models?.[0]?.name ?? "llama3"
      return new OllamaProvider(preferredModel || model)
    }
  } catch {
    // Ollama not available
  }

  throw new Error(
    "No AI provider detected. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or start Ollama locally.",
  )
}
