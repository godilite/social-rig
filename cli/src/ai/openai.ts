import type { AIProvider } from "./provider.js"

interface ChatCompletionResponse {
  choices: { message: { content: string } }[]
  error?: { message: string }
}

export class OpenAIProvider implements AIProvider {
  name = "openai"
  private apiKey: string
  private model: string
  private baseUrl: string

  constructor(apiKey: string, model = "gpt-4o", baseUrl = "https://api.openai.com") {
    this.apiKey = apiKey
    this.model = model
    this.baseUrl = baseUrl
  }

  async generate(prompt: string, systemPrompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`OpenAI API error (${res.status}): ${body}`)
    }

    const data = (await res.json()) as ChatCompletionResponse

    if (data.error) {
      throw new Error(`OpenAI API error: ${data.error.message}`)
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error("OpenAI returned an empty response")
    }

    return content.trim()
  }
}
