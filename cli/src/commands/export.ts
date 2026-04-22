import { Command } from "commander"

export const exportCommand = new Command("export")
  .description("Export approved drafts")
  .option("--format <format>", "Output format: md, json", "md")
  .option("--project <name>", "Export for a specific project")
  .action(async (options: { format: string; project?: string }) => {
    const { runExport } = await import("../review/export.js")
    await runExport(options)
  })
