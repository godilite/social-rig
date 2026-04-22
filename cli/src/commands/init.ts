import { Command } from "commander"

export const initCommand = new Command("init")
  .description("Analyze repo and create .social-rig/ config")
  .argument("[repo]", "Path or URL of the repository", ".")
  .option("--name <name>", "Project name override")
  .action(async (repo: string, options: { name?: string }) => {
    const { runInit } = await import("../config/init.js")
    await runInit(repo, options)
  })
