import type { AIProvider } from "./provider.js"

interface AnthropicResponse {
  content: { type: string; text: string }[]
  error?: { message: string }
}

export class AnthropicProvider implements AIProvider {
  name = "anthropic"
  private apiKey: string
  private model: string

  constructor(apiKey: string, model = "claude-sonnet-4-20250514") {
    this.apiKey = apiKey
    this.model = model
  }

  async generate(prompt: string, systemPrompt: string): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Anthropic API error (${res.status}): ${body}`)
    }

    const data = (await res.json()) as AnthropicResponse

    if (data.error) {
      throw new Error(`Anthropic API error: ${data.error.message}`)
    }

    const textBlock = data.content?.find((b) => b.type === "text")
    if (!textBlock?.text) {
      throw new Error("Anthropic returned an empty response")
    }

    return textBlock.text.trim()
  }
}
