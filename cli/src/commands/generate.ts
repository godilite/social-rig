import { Command } from "commander"

export const generateCommand = new Command("generate")
  .description("Generate marketing content from repo analysis")
  .option("-n, --count <n>", "Number of drafts to generate", "5")
  .option("--project <name>", "Generate for a specific project")
  .option("--all", "Generate for all workspace projects")
  .option("--provider <name>", "Override AI provider for this run")
  .option("--model <name>", "Override model for this run")
  .action(async (options: { count: string; project?: string; all?: boolean; provider?: string; model?: string }) => {
    const { runGenerate } = await import("../generator/run.js")
    await runGenerate(options)
  })
