import gradient from "gradient-string"
import boxen from "boxen"
import chalk from "chalk"

const LOGO = `
   ███████╗ ██████╗  ██████╗██╗ █████╗ ██╗          ██████╗ ██╗ ██████╗ 
   ██╔════╝██╔═══██╗██╔════╝██║██╔══██╗██║          ██╔══██╗██║██╔════╝ 
   ███████╗██║   ██║██║     ██║███████║██║    █████╗ ██████╔╝██║██║  ███╗
   ╚════██║██║   ██║██║     ██║██╔══██║██║    ╚════╝ ██╔══██╗██║██║   ██║
   ███████║╚██████╔╝╚██████╗██║██║  ██║███████╗      ██║  ██║██║╚██████╔╝
   ╚══════╝ ╚═════╝  ╚═════╝╚═╝╚═╝  ╚═╝╚══════╝      ╚═╝  ╚═╝╚═╝ ╚═════╝`

const flame = gradient(["#ff6b35", "#ff3864", "#b537f2", "#3b82f6"])
const ice = gradient(["#3b82f6", "#06b6d4", "#10b981"])

const LOGO_COMPACT = `
  ┏━━━┓ ┏━━━┓ ┏━━━┓ ━━┓ ┏━━━┓ ┓       ┏━━━┓ ━━┓ ┏━━━┓
  ┗━━━┓ ┃   ┃ ┃     ┃  ┣━━━┫ ┃  ━━━  ┣━━━┛ ┃  ┃  ━━┫
  ┗━━━┛ ┗━━━┛ ┗━━━┛ ━━┛ ┛   ┛ ┗━━━┛       ┛  ┛ ━━┛ ┗━━━┛`

export function printCompactBanner(): void {
  const accent = gradient(["#ff6b35", "#ff3864", "#b537f2", "#3b82f6"])
  console.log(accent(LOGO_COMPACT))
  console.log()
}

export function printBanner(version: string): void {
  console.log()
  console.log(flame(LOGO))
  console.log()

  const tagline = boxen(
    [
      chalk.bold.white("  Turn your repo into a marketing machine  "),
      "",
      `${chalk.dim("  Version")}  ${ice(version)}`,
      `${chalk.dim("  Docs")}     ${chalk.cyan("https://github.com/godilite/social-rig")}`,
      "",
      chalk.dim("  Commands:"),
      `    ${chalk.hex("#ff6b35").bold("init")}       ${chalk.gray("Set up social-rig for your project")}`,
      `    ${chalk.hex("#ff3864").bold("generate")}   ${chalk.gray("Create marketing content from your repo")}`,
      `    ${chalk.hex("#b537f2").bold("review")}     ${chalk.gray("Review and approve generated drafts")}`,
      `    ${chalk.hex("#3b82f6").bold("dashboard")}  ${chalk.gray("Launch the visual dashboard")}`,
      `    ${chalk.hex("#06b6d4").bold("status")}     ${chalk.gray("View draft and publishing status")}`,
      `    ${chalk.hex("#10b981").bold("export")}     ${chalk.gray("Export content to files")}`,
    ].join("\n"),
    {
      padding: { top: 1, bottom: 1, left: 2, right: 2 },
      borderStyle: "round",
      borderColor: "#3b82f6",
      dimBorder: true,
    }
  )

  console.log(tagline)
  console.log()
  console.log(
    chalk.dim("  Get started: ") +
    chalk.bold.cyan("social-rig init ") +
    chalk.dim("<path-to-repo>")
  )
  console.log()
}
