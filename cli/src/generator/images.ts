import { mkdirSync, writeFileSync, renameSync, unlinkSync, existsSync, copyFileSync, statSync } from "node:fs"
import { join, resolve, extname, basename } from "node:path"
import { tmpdir } from "node:os"
import { nanoid } from "nanoid"
import type { ImageConfig, ContentType, ProjectProfile } from "../types.js"

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

const ENV_KEYS: Record<string, string[]> = {
  openai: ["OPENAI_API_KEY"],
  dalle: ["OPENAI_API_KEY"],
  stability: ["STABILITY_API_KEY", "STABILITY_KEY"],
  local: [],
}

const MAX_DOWNLOAD_SIZE = 10 * 1024 * 1024
const DOWNLOAD_TIMEOUT_MS = 30_000
const ALLOWED_MIME_PREFIXES = ["image/png", "image/jpeg", "image/webp", "image/gif"]

function resolveProviderKey(provider: string): string | null {
  const candidates = ENV_KEYS[provider] ?? []
  for (const key of candidates) {
    const val = process.env[key]
    if (val) return val
  }
  return null
}

function buildPromptText(prompt: ImagePrompt): string {
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
      const textPrompt = buildPromptText(prompt)

      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: textPrompt,
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

function createStabilityGenerator(apiKey: string): ImageGenerator {
  return {
    name: "stability-sd3",

    async generate(prompt: ImagePrompt): Promise<GeneratedImage> {
      const textPrompt = buildPromptText(prompt)

      const formData = new FormData()
      formData.append("prompt", textPrompt)
      formData.append("output_format", "png")
      formData.append("aspect_ratio", "1:1")

      const response = await fetch(
        "https://api.stability.ai/v2beta/stable-image/generate/sd3",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "image/*",
          },
          body: formData,
        },
      )

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Stability AI error (${response.status}): ${error}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return {
        buffer: Buffer.from(arrayBuffer),
        format: "png",
        width: 1024,
        height: 1024,
      }
    },
  }
}

function createLocalSdGenerator(baseUrl: string): ImageGenerator {
  return {
    name: "local-stable-diffusion",

    async generate(prompt: ImagePrompt): Promise<GeneratedImage> {
      const textPrompt = buildPromptText(prompt)

      const response = await fetch(`${baseUrl}/sdapi/v1/txt2img`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textPrompt,
          negative_prompt: "text, watermark, logo, blurry, low quality",
          width: 1024,
          height: 1024,
          steps: 30,
          cfg_scale: 7,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Local SD error (${response.status}): ${error}`)
      }

      const data = (await response.json()) as { images: string[] }
      const b64 = data.images?.[0]
      if (!b64) {
        throw new Error("No image data returned from local Stable Diffusion")
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

export function createImageGenerator(config: ImageConfig): { generator: ImageGenerator | null; warning?: string } {
  if (!config.enabled) {
    return { generator: null }
  }

  const provider = config.provider.toLowerCase()

  if (provider === "openai" || provider === "dalle") {
    const apiKey = resolveProviderKey("openai")
    if (!apiKey) {
      return {
        generator: null,
        warning: "Image generation enabled but OPENAI_API_KEY not found. Set it in your environment to generate images.",
      }
    }
    return { generator: createDalleGenerator(apiKey) }
  }

  if (provider === "stability") {
    const apiKey = resolveProviderKey("stability")
    if (!apiKey) {
      return {
        generator: null,
        warning: "Image generation enabled but STABILITY_API_KEY not found. Set it in your environment to generate images.",
      }
    }
    return { generator: createStabilityGenerator(apiKey) }
  }

  if (provider === "local") {
    const baseUrl = process.env.LOCAL_SD_URL ?? "http://localhost:7860"
    return { generator: createLocalSdGenerator(baseUrl) }
  }

  return {
    generator: null,
    warning: `Unknown image provider "${config.provider}". Supported: openai, stability, local.`,
  }
}

const CONTENT_TYPE_IMAGE_STYLES: Record<ContentType, { type: ImagePrompt["type"]; prefix: string }> = {
  feature_highlight: { type: "feature_visual", prefix: "A visual representing a software feature" },
  release_announcement: { type: "og_card", prefix: "A celebratory visual for a software release" },
  dev_tip: { type: "abstract_mood", prefix: "An abstract visual representing a developer workflow tip" },
  behind_the_scenes: { type: "abstract_mood", prefix: "A behind-the-scenes look at software development" },
  tutorial_teaser: { type: "feature_visual", prefix: "A visual teaser for a technical tutorial" },
  milestone_celebration: { type: "og_card", prefix: "A celebratory visual for a project milestone" },
}

export function buildImagePrompt(
  contentType: ContentType,
  angle: string,
  profile: ProjectProfile,
  config: ImageConfig,
): ImagePrompt {
  const mapping = CONTENT_TYPE_IMAGE_STYLES[contentType] ?? CONTENT_TYPE_IMAGE_STYLES.feature_highlight
  const techContext = profile.languages.slice(0, 2).join(" and ")

  return {
    type: mapping.type,
    headline: angle,
    description: `${mapping.prefix} for ${profile.name}. ${techContext ? `Tech context: ${techContext}.` : ""} ${angle}`,
    style: config.style || "minimal-tech",
    brandColors: {
      primary: config.brandColors?.primary ?? "#6366f1",
      background: config.brandColors?.background ?? "#0f172a",
    },
  }
}

export function getImagesDir(): string {
  return resolve(".social-rig", "images")
}

export async function saveGeneratedImage(
  draftId: string,
  image: GeneratedImage,
): Promise<string> {
  const imagesDir = getImagesDir()
  mkdirSync(imagesDir, { recursive: true })

  const tempPath = join(tmpdir(), `social-rig-img-${nanoid(8)}.${image.format}`)
  writeFileSync(tempPath, image.buffer)

  const filename = `${draftId}.${image.format}`
  const finalPath = join(imagesDir, filename)

  try {
    renameSync(tempPath, finalPath)
  } catch {
    copyFileSync(tempPath, finalPath)
    try { unlinkSync(tempPath) } catch {}
  }

  return finalPath
}

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false
    const hostname = parsed.hostname.toLowerCase()
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return false
    if (hostname.startsWith("10.") || hostname.startsWith("192.168.") || hostname.startsWith("172.")) return false
    return true
  } catch {
    return false
  }
}

function extensionFromMime(mime: string): string {
  if (mime.includes("png")) return "png"
  if (mime.includes("webp")) return "webp"
  if (mime.includes("gif")) return "gif"
  return "jpg"
}

export async function downloadImage(url: string): Promise<{ buffer: Buffer; format: string }> {
  if (!isAllowedUrl(url)) {
    throw new Error("URL not allowed. Only public http/https URLs are accepted.")
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "social-rig/0.1" },
    })

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get("content-type") ?? ""
    if (!ALLOWED_MIME_PREFIXES.some((m) => contentType.startsWith(m))) {
      throw new Error(`Invalid content type: ${contentType}. Expected an image.`)
    }

    const contentLength = parseInt(response.headers.get("content-length") ?? "0", 10)
    if (contentLength > MAX_DOWNLOAD_SIZE) {
      throw new Error(`Image too large: ${contentLength} bytes. Max: ${MAX_DOWNLOAD_SIZE} bytes.`)
    }

    const arrayBuffer = await response.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_DOWNLOAD_SIZE) {
      throw new Error(`Image too large: ${arrayBuffer.byteLength} bytes. Max: ${MAX_DOWNLOAD_SIZE} bytes.`)
    }

    return {
      buffer: Buffer.from(arrayBuffer),
      format: extensionFromMime(contentType),
    }
  } finally {
    clearTimeout(timeout)
  }
}

export function attachImageFile(draftId: string, sourcePath: string): string {
  if (!existsSync(sourcePath)) {
    throw new Error(`File not found: ${sourcePath}`)
  }

  const stat = statSync(sourcePath)
  if (stat.size > MAX_DOWNLOAD_SIZE) {
    throw new Error(`File too large: ${stat.size} bytes. Max: ${MAX_DOWNLOAD_SIZE} bytes.`)
  }

  const ext = extname(sourcePath).slice(1) || "png"
  const imagesDir = getImagesDir()
  mkdirSync(imagesDir, { recursive: true })

  const filename = `${draftId}.${ext}`
  const finalPath = join(imagesDir, filename)

  copyFileSync(sourcePath, finalPath)
  return finalPath
}

export async function attachImageUrl(draftId: string, url: string): Promise<string> {
  const { buffer, format } = await downloadImage(url)

  const imagesDir = getImagesDir()
  mkdirSync(imagesDir, { recursive: true })

  const tempPath = join(tmpdir(), `social-rig-dl-${nanoid(8)}.${format}`)
  writeFileSync(tempPath, buffer)

  const filename = `${draftId}.${format}`
  const finalPath = join(imagesDir, filename)

  try {
    renameSync(tempPath, finalPath)
  } catch {
    copyFileSync(tempPath, finalPath)
    try { unlinkSync(tempPath) } catch {}
  }

  return finalPath
}

export function removeImage(imagePath: string): void {
  try {
    if (existsSync(imagePath)) unlinkSync(imagePath)
  } catch {}
}

export function resolveImageFilename(filename: string): string | null {
  const sanitized = basename(filename).replace(/[^a-zA-Z0-9._-]/g, "")
  if (sanitized !== filename || sanitized.includes("..")) return null

  const filepath = join(getImagesDir(), sanitized)
  if (!existsSync(filepath)) return null

  return filepath
}
