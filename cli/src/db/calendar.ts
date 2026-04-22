import { nanoid } from "nanoid"
import { getDb } from "./connection.js"
import type { CalendarStatus, Platform } from "../types.js"

export interface CalendarEntryRow {
  id: string
  draft_id: string
  project_id: string
  platform: Platform
  scheduled_at: string
  status: CalendarStatus
  created_at: string
}

export function createCalendarEntry(
  entry: {
    id?: string
    draftId: string
    projectId: string
    platform: Platform
    scheduledAt: string
  },
  db = getDb(),
): void {
  const id = entry.id ?? nanoid()
  db.prepare(
    `INSERT INTO calendar_entries (id, draft_id, project_id, platform, scheduled_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, entry.draftId, entry.projectId, entry.platform, entry.scheduledAt)
}

export function listCalendarEntries(
  filters?: {
    projectId?: string
    month?: string
    status?: CalendarStatus
  },
  db = getDb(),
): CalendarEntryRow[] {
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters?.projectId) {
    conditions.push("project_id = ?")
    params.push(filters.projectId)
  }
  if (filters?.month) {
    conditions.push("strftime('%Y-%m', scheduled_at) = ?")
    params.push(filters.month)
  }
  if (filters?.status) {
    conditions.push("status = ?")
    params.push(filters.status)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  return db
    .prepare(`SELECT * FROM calendar_entries ${where} ORDER BY scheduled_at ASC`)
    .all(...params) as CalendarEntryRow[]
}

export function updateCalendarEntry(
  id: string,
  updates: Partial<Pick<CalendarEntryRow, "scheduled_at" | "status">>,
  db = getDb(),
): void {
  const fields: string[] = []
  const values: unknown[] = []

  if (updates.scheduled_at !== undefined) {
    fields.push("scheduled_at = ?")
    values.push(updates.scheduled_at)
  }
  if (updates.status !== undefined) {
    fields.push("status = ?")
    values.push(updates.status)
  }

  if (fields.length === 0) return

  values.push(id)
  db.prepare(`UPDATE calendar_entries SET ${fields.join(", ")} WHERE id = ?`).run(...values)
}

export function deleteCalendarEntry(id: string, db = getDb()): void {
  db.prepare("DELETE FROM calendar_entries WHERE id = ?").run(id)
}
