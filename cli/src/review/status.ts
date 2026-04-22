import chalk from "chalk"
import { getDraftCounts } from "../db/drafts.js"

export async function runStatus(options: { project?: string }): Promise<void> {
  const counts = getDraftCounts(options.project)
  const total = counts.pending + counts.approved + counts.rejected + counts.published

  const header = options.project
    ? `Draft Status: ${options.project}`
    : "Draft Status (all projects)"

  console.log("")
  console.log(chalk.bold(`  ${header}`))
  console.log(chalk.dim("  ──────────────────────────"))
  console.log(`  ${chalk.yellow("⏳ Pending:")}    ${chalk.bold(String(counts.pending))}`)
  console.log(`  ${chalk.green("✓  Approved:")}   ${chalk.bold(String(counts.approved))}`)
  console.log(`  ${chalk.red("✗  Rejected:")}   ${chalk.bold(String(counts.rejected))}`)
  console.log(`  ${chalk.blue("📤 Published:")}  ${chalk.bold(String(counts.published))}`)
  console.log(chalk.dim("  ──────────────────────────"))
  console.log(`  ${chalk.white("   Total:")}      ${chalk.bold(String(total))}`)
  console.log("")
}
