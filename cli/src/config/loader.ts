import type { ProjectConfig } from "../types.js"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { parse, stringify } from "yaml"
import { resolve, dirname } from "node:path"

export const DEFAULT_CONFIG: ProjectConfig = {
  project: { name: "", repo: ".", description: "" },
  voice: { tone: "witty-technical", audience: "developers", avoid: ["excited to announce", "game-changer", "revolutionary", "leveraging AI"] },
  ai: { provider: "auto", model: "gpt-4o", apiKeySource: "" },
  images: { enabled: false, provider: "openai", style: "minimal-tech", brandColors: { primary: "#6366f1", background: "#0f172a" } },
  content: { types: ["feature_highlight", "release_announcement", "dev_tip"], batchSize: 5, platforms: ["x", "linkedin"], blogTarget: "devto" },
  connectors: { builtin: ["x", "linkedin", "devto"], community: [] },
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    const srcVal = source[key]
    const tgtVal = result[key]
    if (
      srcVal !== null &&
      typeof srcVal === "object" &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === "object" &&
      !Array.isArray(tgtVal)
    ) {
      result[key] = deepMerge(
        tgtVal as Record<string, unknown>,
        srcVal as Record<string, unknown>,
      )
    } else {
      result[key] = srcVal
    }
  }
  return result
}

export function loadConfig(projectPath: string): ProjectConfig {
  const configPath = resolve(projectPath, ".social-rig", "config.yaml")
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG }
  }
  const raw = readFileSync(configPath, "utf-8")
  const parsed = parse(raw) as Record<string, unknown>
  if (!parsed || typeof parsed !== "object") {
    return { ...DEFAULT_CONFIG }
  }
  return deepMerge(
    DEFAULT_CONFIG as unknown as Record<string, unknown>,
    parsed,
  ) as unknown as ProjectConfig
}

export function saveConfig(projectPath: string, config: ProjectConfig): void {
  const configPath = resolve(projectPath, ".social-rig", "config.yaml")
  const dir = dirname(configPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(configPath, stringify(config, { lineWidth: 120 }), "utf-8")
}

export function configExists(projectPath: string): boolean {
  return existsSync(resolve(projectPath, ".social-rig"))
}

export function getConfigPath(projectPath: string): string {
  return resolve(projectPath, ".social-rig", "config.yaml")
}
