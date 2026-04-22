import { Hono } from "hono"
import { getDraft, listDrafts, updateDraftStatus, updateDraftVariant, deleteDraft, getDraftCounts } from "../../db/drafts.js"
import type { DraftStatus, Platform, ContentType } from "../../types.js"

const app = new Hono()

app.get("/", (c) => {
  const projectId = c.req.query("projectId")
  const status = c.req.query("status") as DraftStatus | undefined
  const platform = c.req.query("platform") as Platform | undefined
  const contentType = c.req.query("contentType") as ContentType | undefined

  const drafts = listDrafts({ projectId, status, platform, contentType })
  return c.json(drafts)
})

app.get("/counts", (c) => {
  const projectId = c.req.query("projectId")
  const counts = getDraftCounts(projectId)
  return c.json(counts)
})

app.get("/:id", (c) => {
  const draft = getDraft(c.req.param("id"))
  if (!draft) return c.json({ error: "Draft not found" }, 404)
  return c.json(draft)
})

app.patch("/:id", async (c) => {
  const id = c.req.param("id")
  const body = await c.req.json<{ status: DraftStatus; reviewedAt?: string }>()

  const existing = getDraft(id)
  if (!existing) return c.json({ error: "Draft not found" }, 404)

  updateDraftStatus(id, body.status, body.reviewedAt)
  return c.json(getDraft(id))
})

app.put("/:id/variants/:vid", async (c) => {
  const vid = c.req.param("vid")
  const body = await c.req.json<{ headline?: string; body?: string; hashtags?: string[]; cta?: string }>()

  updateDraftVariant(vid, body)
  return c.json({ ok: true })
})

app.delete("/:id", (c) => {
  const id = c.req.param("id")
  const existing = getDraft(id)
  if (!existing) return c.json({ error: "Draft not found" }, 404)

  deleteDraft(id)
  return c.json({ ok: true })
})

export default app
