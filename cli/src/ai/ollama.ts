import type { AIProvider } from "./provider.js"

interface OllamaGenerateResponse {
  response: string
  done: boolean
  error?: string
}

interface OllamaTagsResponse {
  models?: { name: string }[]
}

export class OllamaProvider implements AIProvider {
  name = "ollama"
  private model: string
  private baseUrl: string

  constructor(model = "llama3", baseUrl = "http://localhost:11434") {
    this.model = model
    this.baseUrl = baseUrl
  }

  async generate(prompt: string, systemPrompt: string): Promise<string> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          system: systemPrompt,
          stream: false,
        }),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(
        `Cannot connect to Ollama at ${this.baseUrl}. Is it running? (${msg})`,
      )
    }

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Ollama API error (${res.status}): ${body}`)
    }

    const data = (await res.json()) as OllamaGenerateResponse

    if (data.error) {
      throw new Error(`Ollama error: ${data.error}`)
    }

    if (!data.response) {
      throw new Error("Ollama returned an empty response")
    }

    return data.response.trim()
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      })
      if (!res.ok) return []
      const data = (await res.json()) as OllamaTagsResponse
      return data.models?.map((m) => m.name) ?? []
    } catch {
      return []
    }
  }
}
