import { mkdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

export interface ImagePrompt {
  type: "og_card" | "feature_visual" | "abstract_mood"
  headline?: string
  description: string
  style: string
  brandColors: {
    primary: string
    background: string
  }
}

export interface GeneratedImage {
  buffer: Buffer
  format: "png" | "webp"
  width: number
  height: number
}

export interface ImageGenerator {
  name: string
  generate(prompt: ImagePrompt): Promise<GeneratedImage>
}

function buildDallePrompt(prompt: ImagePrompt): string {
  const parts = [
    `Create a ${prompt.type.replace(/_/g, " ")} image.`,
    `Description: ${prompt.description}`,
    `Style: ${prompt.style}`,
    `Color palette: primary ${prompt.brandColors.primary}, background ${prompt.brandColors.background}.`,
  ]
  if (prompt.headline) {
    parts.push(`The image should visually represent: "${prompt.headline}"`)
  }
  parts.push("No text in the image. Clean, modern, minimal.")
  return parts.join(" ")
}

function createDalleGenerator(apiKey: string): ImageGenerator {
  return {
    name: "openai-dalle-3",

    async generate(prompt: ImagePrompt): Promise<GeneratedImage> {
      const dallePrompt = buildDallePrompt(prompt)

      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: dallePrompt,
          n: 1,
          size: "1024x1024",
          response_format: "b64_json",
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`DALL-E API error (${response.status}): ${error}`)
      }

      const data = (await response.json()) as {
        data: Array<{ b64_json: string }>
      }

      const b64 = data.data[0]?.b64_json
      if (!b64) {
        throw new Error("No image data returned from DALL-E")
      }

      return {
        buffer: Buffer.from(b64, "base64"),
        format: "png",
        width: 1024,
        height: 1024,
      }
    },
  }
}

function resolveApiKey(apiKeySource: string): string | null {
  if (apiKeySource.startsWith("env:")) {
    return process.env[apiKeySource.slice(4)] ?? null
  }
  return process.env[apiKeySource] ?? null
}

export function createImageGenerator(config: {
  provider: string
  apiKeySource: string
}): ImageGenerator | null {
  if (config.provider === "openai" || config.provider === "dalle") {
    const apiKey = resolveApiKey(config.apiKeySource)
    if (!apiKey) return null
    return createDalleGenerator(apiKey)
  }

  if (config.provider === "stability") {
    return null
  }

  return null
}

export async function saveGeneratedImage(
  draftId: string,
  image: GeneratedImage,
): Promise<string> {
  const imagesDir = resolve(".social-rig", "images")
  mkdirSync(imagesDir, { recursive: true })

  const filename = `${draftId}.${image.format}`
  const filepath = join(imagesDir, filename)
  writeFileSync(filepath, image.buffer)

  return filepath
}
