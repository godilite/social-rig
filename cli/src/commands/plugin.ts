import { Command } from "commander"

export const pluginCommand = new Command("plugin")
  .description("Manage connector plugins")

pluginCommand
  .command("list")
  .description("Show available and installed connectors")
  .action(async () => {
    const { listPlugins } = await import("../connectors/registry.js")
    await listPlugins()
  })

pluginCommand
  .command("add <name>")
  .description("Install a community connector plugin")
  .action(async (name: string) => {
    const { addPlugin } = await import("../connectors/registry.js")
    await addPlugin(name)
  })

pluginCommand
  .command("remove <name>")
  .description("Remove a connector plugin")
  .action(async (name: string) => {
    const { removePlugin } = await import("../connectors/registry.js")
    await removePlugin(name)
  })
