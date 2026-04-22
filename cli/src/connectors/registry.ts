import chalk from "chalk"
import { execSync } from "node:child_process"
import type { ConnectorPlugin } from "../types.js"
import { xConnector } from "./builtin/x.js"
import { linkedinConnector } from "./builtin/linkedin.js"
import { devtoConnector } from "./builtin/devto.js"
import { hashnodeConnector } from "./builtin/hashnode.js"

const builtinConnectors: ConnectorPlugin[] = [
  xConnector,
  linkedinConnector,
  devtoConnector,
  hashnodeConnector,
]

const communityConnectors: ConnectorPlugin[] = []

export function getBuiltinConnectors(): ConnectorPlugin[] {
  return [...builtinConnectors]
}

export function getConnector(id: string): ConnectorPlugin | null {
  return getAllConnectors().find((c) => c.id === id) ?? null
}

export function getAllConnectors(): ConnectorPlugin[] {
  return [...builtinConnectors, ...communityConnectors]
}

export async function listPlugins(): Promise<void> {
  const connectors = getAllConnectors()

  console.log(chalk.bold("\n  Installed Connectors\n"))

  const header = [
    chalk.dim("ID".padEnd(12)),
    chalk.dim("Name".padEnd(18)),
    chalk.dim("Max".padEnd(8)),
    chalk.dim("Threads"),
    chalk.dim("Article"),
    chalk.dim("Media"),
    chalk.dim("Schedule"),
    chalk.dim("Analytics"),
  ].join("  ")

  console.log(`  ${header}`)
  console.log(`  ${chalk.dim("─".repeat(90))}`)

  for (const c of connectors) {
    const cap = c.capabilities
    const flag = (v: boolean) => (v ? chalk.green("✓") : chalk.dim("·"))
    const row = [
      chalk.cyan(c.id.padEnd(12)),
      c.name.padEnd(18),
      String(cap.maxLength).padEnd(8),
      flag(cap.supportsThreads).padEnd(7),
      flag(cap.supportsArticle).padEnd(7),
      flag(cap.supportsMedia).padEnd(5),
      flag(cap.supportsScheduling).padEnd(8),
      flag(cap.supportsAnalytics),
    ].join("  ")
    console.log(`  ${row}`)
  }

  console.log()
}

export async function addPlugin(name: string): Promise<void> {
  const packageName = `@social-rig/connector-${name}`
  console.log(chalk.cyan(`\n  Installing ${packageName}...\n`))

  try {
    execSync(`npm install ${packageName}`, { stdio: "inherit" })
    console.log(chalk.green(`\n  Successfully installed ${packageName}\n`))
  } catch {
    console.log(chalk.red(`\n  Failed to install ${packageName}\n`))
  }
}

export async function removePlugin(name: string): Promise<void> {
  const packageName = `@social-rig/connector-${name}`
  console.log(chalk.cyan(`\n  Removing ${packageName}...\n`))

  try {
    execSync(`npm uninstall ${packageName}`, { stdio: "inherit" })
    console.log(chalk.green(`\n  Successfully removed ${packageName}\n`))
  } catch {
    console.log(chalk.red(`\n  Failed to remove ${packageName}\n`))
  }
}
