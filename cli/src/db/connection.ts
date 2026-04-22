import Database from "better-sqlite3"
import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import { migrations } from "./schema.js"

export type { Database }

let instance: Database.Database | null = null

function runMigrations(db: Database.Database): void {
  for (let i = 0; i < migrations.length; i++) {
    const migrationId = i + 1
    const existing = db
      .prepare("SELECT id FROM migrations WHERE id = ?")
      .get(migrationId)

    if (!existing) {
      db.exec(migrations[i])
      db.prepare("INSERT INTO migrations (id) VALUES (?)").run(migrationId)
    }
  }
}

export function getDb(dbPath?: string): Database.Database {
  if (instance) return instance

  const resolvedPath =
    dbPath ?? join(homedir(), ".social-rig", "data.db")

  if (!dbPath) {
    mkdirSync(join(homedir(), ".social-rig"), { recursive: true })
  }

  const db = new Database(resolvedPath)
  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")

  runMigrations(db)

  instance = db
  return instance
}

export function resetDb(): void {
  if (instance) {
    instance.close()
    instance = null
  }
}

export function createInMemoryDb(): Database.Database {
  const db = new Database(":memory:")
  db.pragma("foreign_keys = ON")
  runMigrations(db)
  return db
}
