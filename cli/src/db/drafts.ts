import { nanoid } from "nanoid"
import { getDb } from "./connection.js"
import type { ContentType, CopyFramework, DraftStatus, Platform, GroundedFact } from "../types.js"

export interface DraftRow {
  id: string
  project_id: string
  content_type: ContentType
  framework: CopyFramework
  status: DraftStatus
  source_facts_json: string | null
  image_path: string | null
  created_at: string
  updated_at: string
  reviewed_at: string | null
  scheduled_at: string | null
}

export interface DraftVariantRow {
  id: string
  draft_id: string
  platform: Platform
  headline: string | null
  body: string
  hashtags_json: string
  cta: string | null
  char_count: number | null
  published_at: string | null
  published_url: string | null
  published_id: string | null
}

export interface DraftWithVariants extends DraftRow {
  variants: DraftVariantRow[]
}

export interface DraftCounts {
  pending: number
  approved: number
  rejected: number
  published: number
}

export function createDraft(
  draft: {
    id?: string
    projectId: string
    contentType: ContentType
    framework: CopyFramework
    sourceFacts?: GroundedFact[]
    imagePath?: string
  },
  db = getDb(),
): void {
  const id = draft.id ?? nanoid()
  db.prepare(
    `INSERT INTO drafts (id, project_id, content_type, framework, source_facts_json, image_path)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    draft.projectId,
    draft.contentType,
    draft.framework,
    draft.sourceFacts ? JSON.stringify(draft.sourceFacts) : null,
    draft.imagePath ?? null,
  )
}

export function createDraftVariant(
  variant: {
    id?: string
    draftId: string
    platform: Platform
    headline?: string
    body: string
    hashtags?: string[]
    cta?: string
    charCount?: number
  },
  db = getDb(),
): void {
  const id = variant.id ?? nanoid()
  db.prepare(
    `INSERT INTO draft_variants (id, draft_id, platform, headline, body, hashtags_json, cta, char_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    variant.draftId,
    variant.platform,
    variant.headline ?? null,
    variant.body,
    JSON.stringify(variant.hashtags ?? []),
    variant.cta ?? null,
    variant.charCount ?? null,
  )
}

export function getDraft(id: string, db = getDb()): DraftWithVariants | null {
  const draft = db.prepare("SELECT * FROM drafts WHERE id = ?").get(id) as DraftRow | undefined
  if (!draft) return null

  const variants = db
    .prepare("SELECT * FROM draft_variants WHERE draft_id = ?")
    .all(id) as DraftVariantRow[]

  return { ...draft, variants }
}

export function listDrafts(
  filters?: {
    projectId?: string
    status?: DraftStatus
    platform?: Platform
    contentType?: ContentType
  },
  db = getDb(),
): DraftRow[] {
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters?.projectId) {
    conditions.push("d.project_id = ?")
    params.push(filters.projectId)
  }
  if (filters?.status) {
    conditions.push("d.status = ?")
    params.push(filters.status)
  }
  if (filters?.contentType) {
    conditions.push("d.content_type = ?")
    params.push(filters.contentType)
  }
  if (filters?.platform) {
    conditions.push("EXISTS (SELECT 1 FROM draft_variants dv WHERE dv.draft_id = d.id AND dv.platform = ?)")
    params.push(filters.platform)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  return db
    .prepare(`SELECT d.* FROM drafts d ${where} ORDER BY d.created_at DESC`)
    .all(...params) as DraftRow[]
}

export function updateDraftStatus(
  id: string,
  status: DraftStatus,
  reviewedAt?: string,
  db = getDb(),
): void {
  db.prepare(
    `UPDATE drafts SET status = ?, reviewed_at = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(status, reviewedAt ?? null, id)
}

export function updateDraftVariant(
  id: string,
  updates: { headline?: string; body?: string; hashtags?: string[]; cta?: string },
  db = getDb(),
): void {
  const fields: string[] = []
  const values: unknown[] = []

  if (updates.headline !== undefined) {
    fields.push("headline = ?")
    values.push(updates.headline)
  }
  if (updates.body !== undefined) {
    fields.push("body = ?")
    values.push(updates.body)
  }
  if (updates.hashtags !== undefined) {
    fields.push("hashtags_json = ?")
    values.push(JSON.stringify(updates.hashtags))
  }
  if (updates.cta !== undefined) {
    fields.push("cta = ?")
    values.push(updates.cta)
  }

  if (fields.length === 0) return

  values.push(id)
  db.prepare(`UPDATE draft_variants SET ${fields.join(", ")} WHERE id = ?`).run(...values)
}

export function deleteDraft(id: string, db = getDb()): void {
  db.prepare("DELETE FROM drafts WHERE id = ?").run(id)
}

export function getDraftCounts(
  projectId?: string,
  db = getDb(),
): DraftCounts {
  const where = projectId ? "WHERE project_id = ?" : ""
  const params = projectId ? [projectId] : []

  const rows = db
    .prepare(
      `SELECT status, COUNT(*) as count FROM drafts ${where} GROUP BY status`,
    )
    .all(...params) as { status: DraftStatus; count: number }[]

  const counts: DraftCounts = { pending: 0, approved: 0, rejected: 0, published: 0 }
  for (const row of rows) {
    counts[row.status] = row.count
  }
  return counts
}
