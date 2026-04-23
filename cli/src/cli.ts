#!/usr/bin/env node

import { Command } from "commander"
import { initCommand } from "./commands/init.js"
import { generateCommand } from "./commands/generate.js"
import { reviewCommand } from "./commands/review.js"
import { exportCommand } from "./commands/export.js"
import { statusCommand } from "./commands/status.js"
import { pluginCommand } from "./commands/plugin.js"
import { dashboardCommand } from "./commands/dashboard.js"
import { profileCommand } from "./commands/profile.js"
import { providerCommand } from "./commands/provider.js"
import { imageCommand } from "./commands/image.js"
import { printBanner } from "./ui/banner.js"

const VERSION = "0.1.0"

const program = new Command()

program
  .name("social-rig")
  .description("Turn your repo into a marketing machine")
  .version(VERSION)
  .action(() => {
    printBanner(VERSION)
  })

program.addCommand(initCommand)
program.addCommand(generateCommand)
program.addCommand(reviewCommand)
program.addCommand(exportCommand)
program.addCommand(statusCommand)
program.addCommand(pluginCommand)
program.addCommand(dashboardCommand)
program.addCommand(profileCommand)
program.addCommand(providerCommand)
program.addCommand(imageCommand)

program.parse()
