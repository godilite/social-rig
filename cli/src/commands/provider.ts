import { Command } from "commander"
import chalk from "chalk"
import ora from "ora"
import { detectProviders } from "../ai/detect.js"
import { createProvider } from "../ai/provider.js"
import { loadConfig, saveConfig } from "../config/loader.js"

const listCommand = new Command("list")
  .description("List all detected AI providers")
  .action(async () => {
    const spinner = ora("Detecting providers...").start()

    try {
      const providers = await detectProviders(true)
      const config = loadConfig(process.cwd())

      spinner.stop()

      if (providers.length === 0) {
        console.log(chalk.yellow("No AI providers detected."))
        return
      }

      const nameWidth = Math.max(20, ...providers.map((p) => p.name.length + 2))
      const typeWidth = 12
      const statusWidth = 12

      console.log("")
      console.log(
        chalk.bold(
          `  ${"Name".padEnd(nameWidth)}${"Type".padEnd(typeWidth)}${"Status".padEnd(statusWidth)}Model`,
        ),
      )
      console.log(chalk.dim(`  ${"─".repeat(nameWidth + typeWidth + statusWidth + 20)}`))

      for (const p of providers) {
        const isActive = p.name === config.ai.provider
        const status = isActive ? chalk.green("active") : chalk.dim("available")
        const name = isActive ? chalk.bold.green(p.name) : p.name
        const model = p.model || chalk.dim("n/a")
        const displayName = isActive ? chalk.bold.green(p.name) : p.name

        console.log(
          `  ${displayName.padEnd(nameWidth + (isActive ? 20 : 0))}${p.type.padEnd(typeWidth)}${(isActive ? "active" : "available").padEnd(statusWidth)}${model}`,
        )
      }

      console.log("")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      spinner.fail(`Detection failed: ${message}`)
      process.exitCode = 1
    }
  })

const switchCommand = new Command("switch")
  .description("Switch to a different AI provider")
  .argument("<name>", "Provider name to switch to")
  .action(async (name: string) => {
    const spinner = ora(`Searching for provider "${name}"...`).start()

    try {
      const providers = await detectProviders(true)
      const match = providers.find((p) => p.name === name)

      if (!match) {
        spinner.fail(`Provider "${name}" not found.`)
        console.log("")
        console.log(chalk.dim("  Available providers:"))
        for (const p of providers) {
          console.log(chalk.dim(`    ${p.name} (${p.type})`))
        }
        console.log("")
        process.exitCode = 1
        return
      }

      const config = loadConfig(process.cwd())
      config.ai.provider = match.name
      if (match.model) {
        config.ai.model = match.model
      }
      if (match.apiKey) {
        config.ai.apiKeySource = match.apiKey
      }
      saveConfig(process.cwd(), config)

      spinner.text = `Testing ${match.name}...`
      const start = Date.now()
      const provider = await createProvider(config.ai)
      await provider.generate("respond with OK", "you are a test")
      const latency = Date.now() - start

      spinner.succeed(
        `Switched to ${chalk.bold(match.name)}${match.model ? ` (${match.model})` : ""} ${chalk.dim(`${latency}ms`)}`,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      spinner.fail(`Switch failed: ${message}`)
      process.exitCode = 1
    }
  })

const testCommand = new Command("test")
  .description("Test the current AI provider")
  .action(async () => {
    const spinner = ora("Loading configuration...").start()

    try {
      const config = loadConfig(process.cwd())

      spinner.text = `Testing ${config.ai.provider}...`
      const start = Date.now()
      const provider = await createProvider(config.ai)
      await provider.generate("respond with OK", "you are a test")
      const latency = Date.now() - start

      spinner.succeed(
        `${chalk.bold(provider.name)} ${chalk.dim(`model=${config.ai.model}`)} ${chalk.green(`${latency}ms`)}`,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      spinner.fail(`Test failed: ${message}`)
      process.exitCode = 1
    }
  })

export const providerCommand = new Command("provider")
  .description("Manage AI providers")
  .addCommand(listCommand)
  .addCommand(switchCommand)
  .addCommand(testCommand)
