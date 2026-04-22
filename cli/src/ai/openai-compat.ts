import type { AIProvider } from "./provider.js"

interface ChatCompletionResponse {
  choices: { message: { content: string } }[]
  error?: { message: string }
}

export class OpenAICompatibleProvider implements AIProvider {
  name: string
  private baseUrl: string
  private model: string
  private apiKey?: string

  constructor(name: string, baseUrl: string, model: string, apiKey?: string) {
    this.name = name
    this.baseUrl = baseUrl
    this.model = model
    this.apiKey = apiKey
  }

  async generate(prompt: string, systemPrompt: string): Promise<string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`
    }

    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`${this.name} API error (${res.status}): ${body}`)
    }

    const data = (await res.json()) as ChatCompletionResponse

    if (data.error) {
      throw new Error(`${this.name} API error: ${data.error.message}`)
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error(`${this.name} returned an empty response`)
    }

    return content.trim()
  }
}

export function createLMStudioProvider(model = "default"): AIProvider {
  return new OpenAICompatibleProvider("lm-studio", "http://localhost:1234", model)
}

export function createJanProvider(model = "default"): AIProvider {
  return new OpenAICompatibleProvider("jan", "http://localhost:1337", model)
}

export function createLocalAIProvider(model = "default"): AIProvider {
  return new OpenAICompatibleProvider("localai", "http://localhost:8080", model)
}

export function createGPT4AllProvider(model = "default"): AIProvider {
  return new OpenAICompatibleProvider("gpt4all", "http://localhost:4891", model)
}
