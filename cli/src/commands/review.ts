import { Command } from "commander"

export const reviewCommand = new Command("review")
  .description("Review pending drafts interactively")
  .option("--project <name>", "Review drafts for a specific project")
  .action(async (options: { project?: string }) => {
    const { runReview } = await import("../review/terminal.js")
    await runReview(options)
  })
