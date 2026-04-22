import type { DetectedProvider } from "../types.js"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { homedir } from "node:os"
import { commandExists } from "./subprocess.js"
import { detectLocalServers } from "./local-servers.js"
import { extractParasitedCredentials } from "./parasite.js"

interface CliCandidate {
  name: string
  command: string
  configPaths: string[]
}

const CLI_CANDIDATES: CliCandidate[] = [
  { name: "claude-cli", command: "claude", configPaths: [".claude"] },
  { name: "gemini-cli", command: "gemini", configPaths: [] },
  { name: "codex-cli", command: "codex", configPaths: [] },
  { name: "opencode-cli", command: "opencode", configPaths: [".opencode"] },
  { name: "goose-cli", command: "goose", configPaths: [".config/goose"] },
  { name: "interpreter-cli", command: "interpreter", configPaths: [] },
]

const ENV_PROVIDERS: { envVar: string; name: string; defaultModel: string }[] = [
  { envVar: "OPENAI_API_KEY", name: "openai", defaultModel: "gpt-4o" },
  { envVar: "ANTHROPIC_API_KEY", name: "anthropic", defaultModel: "claude-sonnet-4-20250514" },
  { envVar: "GOOGLE_API_KEY", name: "google", defaultModel: "gemini-2.0-flash" },
]

let cachedProviders: DetectedProvider[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60_000

async function detectCliProviders(): Promise<DetectedProvider[]> {
  const home = homedir()
  const results = await Promise.allSettled(
    CLI_CANDIDATES.map(async (candidate) => {
      const hasBinary = await commandExists(candidate.command)
      const hasConfig = candidate.configPaths.some((p) => existsSync(resolve(home, p)))

      if (!hasBinary && !hasConfig) return null

      return {
        name: candidate.name,
        source: hasBinary ? candidate.command : resolve(home, candidate.configPaths[0]),
        type: "cli" as const,
        isLocal: true,
      } satisfies DetectedProvider
    }),
  )

  return results
    .filter((r): r is PromiseFulfilledResult<DetectedProvider | null> => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value!)
}

async function detectServerProviders(): Promise<DetectedProvider[]> {
  const servers = await detectLocalServers() ?? []
  return servers.map((s) => ({
    name: s.name,
    source: s.baseUrl,
    type: "server" as const,
    model: s.models[0],
    models: s.models,
    isLocal: true,
  }))
}

function detectCloudProviders(): DetectedProvider[] {
  return ENV_PROVIDERS
    .filter((p) => process.env[p.envVar])
    .map((p) => ({
      name: p.name,
      source: `env:${p.envVar}`,
      type: "cloud" as const,
      model: p.defaultModel,
      apiKey: process.env[p.envVar],
      isLocal: false,
    }))
}

async function detectParasitedProviders(): Promise<DetectedProvider[]> {
  const creds = await extractParasitedCredentials() ?? []
  return creds.map((c) => ({
    name: `${c.provider} (via ${c.source})`,
    source: c.configPath,
    type: "parasited" as const,
    model: c.model,
    apiKey: c.apiKey,
    isLocal: false,
  }))
}

function deduplicateProviders(providers: DetectedProvider[]): DetectedProvider[] {
  const seen = new Set<string>()
  const unique: DetectedProvider[] = []

  for (const p of providers) {
    const key = p.apiKey ? `${p.name}:${p.apiKey}` : p.name
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(p)
  }

  return unique
}

export async function detectProviders(bypassCache = false): Promise<DetectedProvider[]> {
  if (!bypassCache && cachedProviders && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedProviders
  }

  const [cliProviders, serverProviders, parasitedProviders] = await Promise.all([
    detectCliProviders(),
    detectServerProviders(),
    detectParasitedProviders(),
  ])

  const cloudProviders = detectCloudProviders()

  const ranked = [
    ...cliProviders,
    ...serverProviders,
    ...parasitedProviders,
    ...cloudProviders,
  ]

  const result = deduplicateProviders(ranked)

  cachedProviders = result
  cacheTimestamp = Date.now()

  return result
}

export function clearProviderCache(): void {
  cachedProviders = null
  cacheTimestamp = 0
}
