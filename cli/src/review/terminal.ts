import chalk from "chalk"
import inquirer from "inquirer"
import { execSync } from "node:child_process"
import { writeFileSync, readFileSync, unlinkSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { nanoid } from "nanoid"
import { listDrafts, getDraft, updateDraftStatus, updateDraftVariant } from "../db/drafts.js"
import { logActivity } from "../db/activity.js"
import { CONTENT_TYPE_LABELS, FRAMEWORK_LABELS } from "../config/schema.js"
import type { DraftWithVariants, DraftVariantRow } from "../db/drafts.js"

function formatVariant(variant: DraftVariantRow): string {
  const hashtags: string[] = JSON.parse(variant.hashtags_json || "[]")
  const lines: string[] = []

  lines.push(chalk.cyan.bold(`  ┌─ ${variant.platform.toUpperCase()}`))

  if (variant.headline) {
    lines.push(chalk.white(`  │  ${chalk.bold(variant.headline)}`))
  }

  const bodyLines = variant.body.split("\n")
  for (const line of bodyLines) {
    lines.push(chalk.white(`  │  ${line}`))
  }

  if (hashtags.length > 0) {
    lines.push(chalk.blue(`  │  ${hashtags.map((t) => `#${t}`).join(" ")}`))
  }

  if (variant.cta) {
    lines.push(chalk.yellow(`  │  CTA: ${variant.cta}`))
  }

  lines.push(chalk.dim(`  │  ${variant.char_count ?? variant.body.length} chars`))
  lines.push(chalk.cyan(`  └─`))

  return lines.join("\n")
}

function formatDraft(draft: DraftWithVariants, index: number, total: number): string {
  const lines: string[] = []
  const typeLabel = CONTENT_TYPE_LABELS[draft.content_type] ?? draft.content_type
  const fwLabel = FRAMEWORK_LABELS[draft.framework] ?? draft.framework

  lines.push("")
  lines.push(chalk.white.bold(`  Draft ${index + 1}/${total}`) + chalk.dim(` (${draft.id})`))
  lines.push(chalk.gray(`  ${typeLabel} · ${fwLabel}`))
  lines.push("")

  for (const variant of draft.variants) {
    lines.push(formatVariant(variant))
    lines.push("")
  }

  if (draft.source_facts_json) {
    const facts = JSON.parse(draft.source_facts_json)
    if (Array.isArray(facts) && facts.length > 0) {
      lines.push(chalk.dim.bold("  Source Facts:"))
      for (const fact of facts) {
        lines.push(chalk.dim(`    • ${fact.claim} (${fact.source})`))
      }
      lines.push("")
    }
  }

  if (draft.image_path) {
    lines.push(chalk.dim(`  📷 Image: ${draft.image_path}`))
    lines.push("")
  }

  return lines.join("\n")
}

async function editVariant(variant: DraftVariantRow): Promise<string> {
  const editor = process.env.EDITOR || "vi"
  const tempFile = join(tmpdir(), `social-rig-edit-${nanoid(8)}.txt`)

  writeFileSync(tempFile, variant.body, "utf-8")

  try {
    execSync(`${editor} "${tempFile}"`, { stdio: "inherit" })
    return readFileSync(tempFile, "utf-8")
  } finally {
    try {
      unlinkSync(tempFile)
    } catch {}
  }
}

export async function runReview(options: { project?: string }): Promise<void> {
  const pendingRows = listDrafts({ projectId: options.project, status: "pending" })

  if (pendingRows.length === 0) {
    console.log(chalk.yellow("\n  No pending drafts to review.\n"))
    return
  }

  console.log(chalk.bold(`\n  📋 ${pendingRows.length} pending draft(s) to review\n`))

  let approved = 0
  let rejected = 0
  let skipped = 0
  let reviewed = 0

  for (let i = 0; i < pendingRows.length; i++) {
    const draft = getDraft(pendingRows[i].id)
    if (!draft) continue

    console.log(formatDraft(draft, i, pendingRows.length))

    const { action } = await inquirer.prompt<{ action: string }>([
      {
        type: "list",
        name: "action",
        message: "Action:",
        choices: [
          { name: chalk.green("✓ Approve"), value: "approve" },
          { name: chalk.blue("✎ Edit"), value: "edit" },
          { name: chalk.red("✗ Reject"), value: "reject" },
          { name: chalk.magenta("↻ Regenerate"), value: "regenerate" },
          { name: chalk.dim("→ Skip"), value: "skip" },
          { name: chalk.dim("✕ Quit"), value: "quit" },
        ],
      },
    ])

    const now = new Date().toISOString()

    if (action === "approve") {
      updateDraftStatus(draft.id, "approved", now)
      logActivity(draft.project_id, "draft_approved", { draftId: draft.id })
      console.log(chalk.green("  ✓ Approved\n"))
      approved++
      reviewed++
    } else if (action === "edit") {
      if (draft.variants.length === 0) {
        console.log(chalk.yellow("  No variants to edit.\n"))
        skipped++
        continue
      }

      let variantToEdit = draft.variants[0]
      if (draft.variants.length > 1) {
        const { variantId } = await inquirer.prompt<{ variantId: string }>([
          {
            type: "list",
            name: "variantId",
            message: "Which variant to edit?",
            choices: draft.variants.map((v) => ({
              name: `${v.platform.toUpperCase()}`,
              value: v.id,
            })),
          },
        ])
        variantToEdit = draft.variants.find((v) => v.id === variantId) ?? draft.variants[0]
      }

      const newBody = await editVariant(variantToEdit)
      updateDraftVariant(variantToEdit.id, { body: newBody.trim() })
      logActivity(draft.project_id, "draft_edited", {
        draftId: draft.id,
        variantId: variantToEdit.id,
        platform: variantToEdit.platform,
      })
      console.log(chalk.blue("  ✎ Variant updated\n"))
      i--
    } else if (action === "reject") {
      updateDraftStatus(draft.id, "rejected", now)
      logActivity(draft.project_id, "draft_rejected", { draftId: draft.id })
      console.log(chalk.red("  ✗ Rejected\n"))
      rejected++
      reviewed++
    } else if (action === "regenerate") {
      const { feedback } = await inquirer.prompt<{ feedback: string }>([
        {
          type: "input",
          name: "feedback",
          message: "Feedback for regeneration:",
        },
      ])
      updateDraftStatus(draft.id, "rejected", now)
      logActivity(draft.project_id, "draft_regenerate_requested", {
        draftId: draft.id,
        feedback,
      })
      console.log(chalk.magenta("  ↻ Marked for regeneration\n"))
      rejected++
      reviewed++
    } else if (action === "skip") {
      logActivity(draft.project_id, "draft_skipped", { draftId: draft.id })
      skipped++
      reviewed++
    } else if (action === "quit") {
      logActivity(null, "review_quit", { reviewedSoFar: reviewed })
      break
    }
  }

  console.log(chalk.bold("\n  Review Summary"))
  console.log(chalk.dim("  ─────────────"))
  console.log(`  Reviewed: ${chalk.white.bold(String(reviewed))} drafts`)
  console.log(`  ${chalk.green("Approved:")} ${approved}`)
  console.log(`  ${chalk.red("Rejected:")} ${rejected}`)
  console.log(`  ${chalk.dim("Skipped:")}  ${skipped}`)
  console.log("")
}
