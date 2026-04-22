import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { Hono } from "hono"
import Database from "better-sqlite3"
import { migrations } from "../../db/schema.js"

function setupDb(): Database.Database {
  const db = new Database(":memory:")
  db.pragma("foreign_keys = ON")
  db.exec(
    "CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))"
  )
  db.exec(migrations[0])
  db.prepare("INSERT INTO migrations (id) VALUES (?)").run(1)
  return db
}

function seedProject(db: Database.Database): string {
  const id = "proj-test-1"
  db.prepare(
    "INSERT INTO projects (id, name, repo) VALUES (?, ?, ?)",
  ).run(id, "test-project", "https://github.com/test/repo")
  return id
}

function seedDraft(db: Database.Database, projectId: string, draftId: string, status = "pending") {
  db.prepare(
    "INSERT INTO drafts (id, project_id, content_type, framework, status) VALUES (?, ?, ?, ?, ?)",
  ).run(draftId, projectId, "feature_highlight", "PAS", status)
}

function seedVariant(db: Database.Database, draftId: string, variantId: string) {
  db.prepare(
    "INSERT INTO draft_variants (id, draft_id, platform, body, hashtags_json) VALUES (?, ?, ?, ?, ?)",
  ).run(variantId, draftId, "x", "Check this out!", "[]")
}

describe("drafts routes", () => {
  let db: Database.Database
  let app: Hono
  let projectId: string

  beforeEach(async () => {
    db = setupDb()
    projectId = seedProject(db)

    vi.doMock("../../db/connection.js", () => ({
      getDb: () => db,
      resetDb: vi.fn(),
      createInMemoryDb: vi.fn(),
    }))

    vi.resetModules()
    const draftsModule = await import("./drafts.js")
    app = new Hono()
    app.route("/api/drafts", draftsModule.default)
  })

  afterEach(() => {
    db.close()
    vi.restoreAllMocks()
  })

  it("GET /api/drafts returns empty list initially", async () => {
    const res = await app.request("/api/drafts")

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it("GET /api/drafts returns list of drafts", async () => {
    seedDraft(db, projectId, "d1")
    seedDraft(db, projectId, "d2")

    const res = await app.request("/api/drafts")

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
  })

  it("GET /api/drafts/:id returns draft with variants", async () => {
    seedDraft(db, projectId, "d1")
    seedVariant(db, "d1", "v1")

    const res = await app.request("/api/drafts/d1")

    expect(res.status).toBe(200)
    const body = await res.json() as { id: string; variants: { id: string }[] }
    expect(body.id).toBe("d1")
    expect(body.variants).toHaveLength(1)
    expect(body.variants[0].id).toBe("v1")
  })

  it("GET /api/drafts/:id returns 404 for missing draft", async () => {
    const res = await app.request("/api/drafts/nonexistent")

    expect(res.status).toBe(404)
    const body = await res.json() as { error: string }
    expect(body.error).toBe("Draft not found")
  })

  it("PATCH /api/drafts/:id updates status", async () => {
    seedDraft(db, projectId, "d1")

    const res = await app.request("/api/drafts/d1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved", reviewedAt: "2024-06-15T10:00:00Z" }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { status: string; reviewed_at: string }
    expect(body.status).toBe("approved")
    expect(body.reviewed_at).toBe("2024-06-15T10:00:00Z")
  })

  it("PATCH /api/drafts/:id returns 404 for missing draft", async () => {
    const res = await app.request("/api/drafts/nonexistent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    })

    expect(res.status).toBe(404)
  })

  it("DELETE /api/drafts/:id removes draft", async () => {
    seedDraft(db, projectId, "d1")

    const res = await app.request("/api/drafts/d1", { method: "DELETE" })

    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(true)

    const check = await app.request("/api/drafts/d1")
    expect(check.status).toBe(404)
  })

  it("DELETE /api/drafts/:id returns 404 for missing draft", async () => {
    const res = await app.request("/api/drafts/nonexistent", { method: "DELETE" })
    expect(res.status).toBe(404)
  })

  it("GET /api/drafts?status=approved filters by status", async () => {
    seedDraft(db, projectId, "d1", "pending")
    seedDraft(db, projectId, "d2", "approved")

    const res = await app.request("/api/drafts?status=approved")

    expect(res.status).toBe(200)
    const body = await res.json() as { id: string }[]
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe("d2")
  })
})
