import chalk from "chalk"
import { mkdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { listDrafts, getDraft } from "../db/drafts.js"
import { logActivity } from "../db/activity.js"
import { CONTENT_TYPE_LABELS, FRAMEWORK_LABELS } from "../config/schema.js"
import type { DraftWithVariants, DraftVariantRow } from "../db/drafts.js"

function variantToMarkdown(variant: DraftVariantRow): string {
  const hashtags: string[] = JSON.parse(variant.hashtags_json || "[]")
  const lines: string[] = []

  lines.push(`### ${variant.platform.toUpperCase()}`)
  lines.push("")

  if (variant.headline) {
    lines.push(`**${variant.headline}**`)
    lines.push("")
  }

  lines.push(variant.body)
  lines.push("")

  if (hashtags.length > 0) {
    lines.push(hashtags.map((t) => `#${t}`).join(" "))
    lines.push("")
  }

  if (variant.cta) {
    lines.push(`> CTA: ${variant.cta}`)
    lines.push("")
  }

  return lines.join("\n")
}

function draftToMarkdown(draft: DraftWithVariants): string {
  const typeLabel = CONTENT_TYPE_LABELS[draft.content_type] ?? draft.content_type
  const fwLabel = FRAMEWORK_LABELS[draft.framework] ?? draft.framework
  const lines: string[] = []

  lines.push(`# ${typeLabel}`)
  lines.push("")
  lines.push(`- **Framework:** ${fwLabel}`)
  lines.push(`- **Project:** ${draft.project_id}`)
  lines.push(`- **Created:** ${draft.created_at}`)
  if (draft.reviewed_at) {
    lines.push(`- **Reviewed:** ${draft.reviewed_at}`)
  }
  lines.push("")

  for (const variant of draft.variants) {
    lines.push(variantToMarkdown(variant))
  }

  if (draft.source_facts_json) {
    const facts = JSON.parse(draft.source_facts_json)
    if (Array.isArray(facts) && facts.length > 0) {
      lines.push("## Source Facts")
      lines.push("")
      for (const fact of facts) {
        lines.push(`- ${fact.claim} _(${fact.source}, ${fact.confidence})_`)
      }
      lines.push("")
    }
  }

  if (draft.image_path) {
    lines.push(`## Image`)
    lines.push("")
    lines.push(`![Generated Image](${draft.image_path})`)
    lines.push("")
  }

  return lines.join("\n")
}

function draftToJsonObject(draft: DraftWithVariants): Record<string, unknown> {
  return {
    id: draft.id,
    projectId: draft.project_id,
    contentType: draft.content_type,
    framework: draft.framework,
    status: draft.status,
    createdAt: draft.created_at,
    reviewedAt: draft.reviewed_at,
    imagePath: draft.image_path,
    sourceFacts: draft.source_facts_json ? JSON.parse(draft.source_facts_json) : [],
    variants: draft.variants.map((v) => ({
      platform: v.platform,
      headline: v.headline,
      body: v.body,
      hashtags: JSON.parse(v.hashtags_json || "[]"),
      cta: v.cta,
      charCount: v.char_count,
    })),
  }
}

export async function runExport(options: { format: string; project?: string }): Promise<void> {
  const approvedRows = listDrafts({ projectId: options.project, status: "approved" })

  if (approvedRows.length === 0) {
    console.log(chalk.yellow("\n  No approved drafts to export.\n"))
    return
  }

  const exportDir = resolve(".social-rig", "exports")
  mkdirSync(exportDir, { recursive: true })

  const drafts: DraftWithVariants[] = []
  for (const row of approvedRows) {
    const draft = getDraft(row.id)
    if (draft) drafts.push(draft)
  }

  const format = options.format.toLowerCase()

  if (format === "json") {
    const data = drafts.map(draftToJsonObject)
    const filename = `export-${Date.now()}.json`
    const filepath = join(exportDir, filename)
    writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8")
    console.log(chalk.green(`\n  Exported ${drafts.length} draft(s) to ${filepath}\n`))
  } else {
    for (const draft of drafts) {
      const filename = `${draft.id}.md`
      const filepath = join(exportDir, filename)
      writeFileSync(filepath, draftToMarkdown(draft), "utf-8")
    }
    console.log(chalk.green(`\n  Exported ${drafts.length} draft(s) to ${exportDir}/\n`))
  }

  logActivity(options.project ?? null, "drafts_exported", {
    format,
    count: drafts.length,
  })
}
