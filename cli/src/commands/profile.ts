import { Command } from "commander"

export const profileCommand = new Command("profile")
  .description("Show or regenerate project profile")
  .option("--project <name>", "Project to show profile for")
  .option("--regenerate", "Regenerate the project profile from repo analysis")
  .action(async (options: { project?: string; regenerate?: boolean }) => {
    const { runProfile } = await import("../analyzer/profile.js")
    await runProfile(options)
  })
