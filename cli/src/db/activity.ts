import { getDb } from "./connection.js"

export interface ActivityRow {
  id: number
  project_id: string | null
  action: string
  details_json: string
  created_at: string
}

export function logActivity(
  projectId: string | null,
  action: string,
  details: Record<string, unknown>,
  db = getDb(),
): void {
  db.prepare(
    `INSERT INTO activity_log (project_id, action, details_json) VALUES (?, ?, ?)`,
  ).run(projectId, action, JSON.stringify(details))
}

export function getActivity(
  filters?: { projectId?: string; limit?: number },
  db = getDb(),
): ActivityRow[] {
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters?.projectId) {
    conditions.push("project_id = ?")
    params.push(filters.projectId)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  const limit = filters?.limit ?? 50

  return db
    .prepare(`SELECT * FROM activity_log ${where} ORDER BY created_at DESC LIMIT ?`)
    .all(...params, limit) as ActivityRow[]
}
