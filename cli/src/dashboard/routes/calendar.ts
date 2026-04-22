import { Hono } from "hono"
import { createCalendarEntry, listCalendarEntries, updateCalendarEntry, deleteCalendarEntry } from "../../db/calendar.js"
import type { CalendarStatus, Platform } from "../../types.js"

const app = new Hono()

app.get("/", (c) => {
  const projectId = c.req.query("projectId")
  const month = c.req.query("month")
  const status = c.req.query("status") as CalendarStatus | undefined

  const entries = listCalendarEntries({ projectId, month, status })
  return c.json(entries)
})

app.post("/", async (c) => {
  const body = await c.req.json<{
    draftId: string
    projectId: string
    platform: Platform
    scheduledAt: string
  }>()

  createCalendarEntry({
    draftId: body.draftId,
    projectId: body.projectId,
    platform: body.platform,
    scheduledAt: body.scheduledAt,
  })

  return c.json({ ok: true }, 201)
})

app.patch("/:id", async (c) => {
  const id = c.req.param("id")
  const body = await c.req.json<{ scheduledAt?: string; status?: CalendarStatus }>()

  updateCalendarEntry(id, {
    scheduled_at: body.scheduledAt,
    status: body.status,
  })

  return c.json({ ok: true })
})

app.delete("/:id", (c) => {
  deleteCalendarEntry(c.req.param("id"))
  return c.json({ ok: true })
})

export default app
