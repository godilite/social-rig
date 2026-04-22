import { nanoid } from "nanoid"
import { getDb } from "./connection.js"

export interface ProjectRow {
  id: string
  name: string
  repo: string
  description: string | null
  config_path: string | null
  profile_json: string | null
  created_at: string
  updated_at: string
}

export function createProject(
  project: {
    name: string
    repo: string
    description?: string
    configPath?: string
  },
  db = getDb(),
): ProjectRow {
  const id = nanoid()
  db.prepare(
    `INSERT INTO projects (id, name, repo, description, config_path)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, project.name, project.repo, project.description ?? null, project.configPath ?? null)

  return getProject(id, db)!
}

export function getProject(id: string, db = getDb()): ProjectRow | null {
  return (
    (db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined) ?? null
  )
}

export function getProjectByName(name: string, db = getDb()): ProjectRow | null {
  return (
    (db
      .prepare("SELECT * FROM projects WHERE name = ?")
      .get(name) as ProjectRow | undefined) ?? null
  )
}

export function listProjects(db = getDb()): ProjectRow[] {
  return db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all() as ProjectRow[]
}

export function updateProject(
  id: string,
  updates: Partial<Pick<ProjectRow, "name" | "repo" | "description" | "config_path">>,
  db = getDb(),
): void {
  const fields: string[] = []
  const values: unknown[] = []

  if (updates.name !== undefined) {
    fields.push("name = ?")
    values.push(updates.name)
  }
  if (updates.repo !== undefined) {
    fields.push("repo = ?")
    values.push(updates.repo)
  }
  if (updates.description !== undefined) {
    fields.push("description = ?")
    values.push(updates.description)
  }
  if (updates.config_path !== undefined) {
    fields.push("config_path = ?")
    values.push(updates.config_path)
  }

  if (fields.length === 0) return

  fields.push("updated_at = datetime('now')")
  values.push(id)

  db.prepare(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`).run(...values)
}

export function deleteProject(id: string, db = getDb()): void {
  db.prepare("DELETE FROM projects WHERE id = ?").run(id)
}

export function updateProjectProfile(id: string, profileJson: string, db = getDb()): void {
  db.prepare(
    "UPDATE projects SET profile_json = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(profileJson, id)
}
