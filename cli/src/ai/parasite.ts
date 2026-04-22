import { existsSync, readFileSync, readdirSync } from "node:fs"
import { resolve, join } from "node:path"
import { homedir } from "node:os"
import YAML from "yaml"

export interface ParasitedCredential {
  source: string
  provider: string
  apiKey: string
  model?: string
  configPath: string
}

const CONTINUE_PROVIDER_MAP: Record<string, string | null> = {
  openai: "openai",
  anthropic: "anthropic",
  ollama: null,
}

function readJsonFile(path: string): unknown {
  const raw = readFileSync(path, "utf-8")
  return JSON.parse(raw)
}

export function parseAiderConfig(): ParasitedCredential[] {
  const configPath = resolve(homedir(), ".aider.conf.yml")
  if (!existsSync(configPath)) return []

  try {
    const raw = readFileSync(configPath, "utf-8")
    const config = YAML.parse(raw) as Record<string, unknown>
    if (!config || typeof config !== "object") return []

    const results: ParasitedCredential[] = []
    const model = typeof config["model"] === "string" ? config["model"] : undefined

    if (typeof config["openai-api-key"] === "string" && config["openai-api-key"]) {
      results.push({
        source: "aider",
        provider: "openai",
        apiKey: config["openai-api-key"],
        model,
        configPath,
      })
    }

    if (typeof config["anthropic-api-key"] === "string" && config["anthropic-api-key"]) {
      results.push({
        source: "aider",
        provider: "anthropic",
        apiKey: config["anthropic-api-key"],
        model,
        configPath,
      })
    }

    return results
  } catch {
    return []
  }
}

export function parseContinueConfig(): ParasitedCredential[] {
  const configPath = resolve(homedir(), ".continue", "config.json")
  if (!existsSync(configPath)) return []

  try {
    const config = readJsonFile(configPath) as Record<string, unknown>
    if (!config || typeof config !== "object") return []

    const models = config["models"]
    if (!Array.isArray(models)) return []

    const results: ParasitedCredential[] = []

    for (const entry of models) {
      if (!entry || typeof entry !== "object") continue

      const raw = entry as Record<string, unknown>
      const providerName = typeof raw["provider"] === "string" ? raw["provider"] : null
      const apiKey = typeof raw["apiKey"] === "string" ? raw["apiKey"] : null
      const model = typeof raw["model"] === "string" ? raw["model"] : undefined

      if (!providerName || !apiKey) continue

      const mapped = CONTINUE_PROVIDER_MAP[providerName]
      if (mapped === null || mapped === undefined) continue

      results.push({
        source: "continue",
        provider: mapped,
        apiKey,
        model,
        configPath,
      })
    }

    return results
  } catch {
    return []
  }
}

export function parseOpenCodeConfig(): ParasitedCredential[] {
  const configPath = resolve(homedir(), ".opencode", "config.json")
  if (!existsSync(configPath)) return []

  try {
    const config = readJsonFile(configPath) as Record<string, unknown>
    if (!config || typeof config !== "object") return []

    const results: ParasitedCredential[] = []

    const topProvider = typeof config["provider"] === "string" ? config["provider"] : undefined
    const topApiKey = typeof config["apiKey"] === "string" ? config["apiKey"] : undefined
    const topModel = typeof config["model"] === "string" ? config["model"] : undefined

    if (topApiKey && topProvider) {
      results.push({
        source: "opencode",
        provider: topProvider,
        apiKey: topApiKey,
        model: topModel,
        configPath,
      })
    }

    for (const key of Object.keys(config)) {
      const value = config[key]
      if (!value || typeof value !== "object" || Array.isArray(value)) continue

      const section = value as Record<string, unknown>
      const sectionApiKey = typeof section["apiKey"] === "string" ? section["apiKey"] : undefined
      const sectionProvider =
        typeof section["provider"] === "string" ? section["provider"] : key
      const sectionModel = typeof section["model"] === "string" ? section["model"] : undefined

      if (!sectionApiKey) continue

      results.push({
        source: "opencode",
        provider: sectionProvider,
        apiKey: sectionApiKey,
        model: sectionModel,
        configPath,
      })
    }

    return results
  } catch {
    return []
  }
}

export function parseCodyConfig(): ParasitedCredential[] {
  const sgDir = resolve(homedir(), ".sourcegraph")
  if (!existsSync(sgDir)) return []

  try {
    const results: ParasitedCredential[] = []
    const files = readdirSync(sgDir)

    for (const file of files) {
      try {
        const filePath = join(sgDir, file)
        const raw = readFileSync(filePath, "utf-8")

        let parsed: unknown
        try {
          parsed = JSON.parse(raw)
        } catch {
          const tokenMatch = raw.match(/(?:token|api[_-]?key|access[_-]?token)\s*[=:]\s*["']?([a-zA-Z0-9_-]{20,})["']?/)
          if (tokenMatch?.[1]) {
            results.push({
              source: "cody",
              provider: "sourcegraph",
              apiKey: tokenMatch[1],
              configPath: filePath,
            })
          }
          continue
        }

        if (!parsed || typeof parsed !== "object") continue

        const obj = parsed as Record<string, unknown>
        const token =
          (typeof obj["token"] === "string" && obj["token"]) ||
          (typeof obj["accessToken"] === "string" && obj["accessToken"]) ||
          (typeof obj["apiKey"] === "string" && obj["apiKey"])

        if (token) {
          results.push({
            source: "cody",
            provider: "sourcegraph",
            apiKey: token,
            configPath: filePath,
          })
        }
      } catch {
        continue
      }
    }

    return results
  } catch {
    return []
  }
}

function deduplicateCredentials(credentials: ParasitedCredential[]): ParasitedCredential[] {
  const seen = new Set<string>()
  const unique: ParasitedCredential[] = []

  for (const cred of credentials) {
    const key = `${cred.provider}:${cred.apiKey}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(cred)
  }

  return unique
}

export async function extractParasitedCredentials(): Promise<ParasitedCredential[]> {
  const results = await Promise.allSettled([
    Promise.resolve(parseAiderConfig()),
    Promise.resolve(parseContinueConfig()),
    Promise.resolve(parseOpenCodeConfig()),
    Promise.resolve(parseCodyConfig()),
  ])

  const all: ParasitedCredential[] = []

  for (const result of results) {
    if (result.status === "fulfilled") {
      all.push(...result.value)
    }
  }

  return deduplicateCredentials(all)
}
