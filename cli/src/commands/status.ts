import { Command } from "commander"

export const statusCommand = new Command("status")
  .description("Show draft counts by status across all projects")
  .option("--project <name>", "Show status for a specific project")
  .action(async (options: { project?: string }) => {
    const { runStatus } = await import("../review/status.js")
    await runStatus(options)
  })
