import type { DetectedProvider } from "../types.js"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { homedir } from "node:os"

async function checkOllama(): Promise<DetectedProvider | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)
    const res = await fetch("http://localhost:11434/api/tags", {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (res.ok) {
      const data = (await res.json()) as { models?: { name: string }[] }
      const model = data.models?.[0]?.name
      return {
        name: "ollama",
        source: "http://localhost:11434",
        model: model ?? "llama3",
        isLocal: true,
      }
    }
  } catch {
    return null
  }
  return null
}

function checkEnvProvider(
  envVar: string,
  name: string,
  defaultModel: string,
): DetectedProvider | null {
  const key = process.env[envVar]
  if (!key) return null
  return {
    name,
    source: `env:${envVar}`,
    model: defaultModel,
    apiKey: key,
    isLocal: false,
  }
}

function checkPathExists(
  paths: string[],
  name: string,
  source: string,
): DetectedProvider | null {
  const home = homedir()
  for (const p of paths) {
    if (existsSync(resolve(home, p))) {
      return { name, source, isLocal: true }
    }
  }
  return null
}

export async function detectProviders(): Promise<DetectedProvider[]> {
  const providers: DetectedProvider[] = []

  const envProviders = [
    checkEnvProvider("OPENAI_API_KEY", "openai", "gpt-4o"),
    checkEnvProvider("ANTHROPIC_API_KEY", "anthropic", "claude-sonnet-4-20250514"),
  ].filter((p): p is DetectedProvider => p !== null)

  providers.push(...envProviders)

  const ollama = await checkOllama()
  if (ollama) providers.push(ollama)

  const localTools = [
    checkPathExists([".copilot"], "copilot", "~/.copilot/"),
    checkPathExists([".cursor"], "cursor", "~/.cursor/"),
    checkPathExists([".aider.conf.yml"], "aider", "~/.aider.conf.yml"),
    checkPathExists([".continue/config.json"], "continue", "~/.continue/config.json"),
    checkPathExists([".claude", ".config/claude"], "claude-cli", "~/.claude/"),
  ].filter((p): p is DetectedProvider => p !== null)

  providers.push(...localTools)

  return providers
}
