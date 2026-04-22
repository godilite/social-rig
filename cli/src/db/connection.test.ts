import { describe, it, expect, beforeEach } from "vitest"
import Database from "better-sqlite3"
import { migrations } from "./schema.js"
import { createProject, getProject, getProjectByName, listProjects, updateProject, deleteProject, updateProjectProfile } from "./projects.js"
import { createDraft, createDraftVariant, getDraft, listDrafts, updateDraftStatus, deleteDraft, getDraftCounts } from "./drafts.js"
import { createCalendarEntry, listCalendarEntries, updateCalendarEntry, deleteCalendarEntry } from "./calendar.js"
import { logActivity, getActivity } from "./activity.js"

function setupDb(): Database.Database {
  const db = new Database(":memory:")
  db.pragma("foreign_keys = ON")
  db.exec(migrations[0])
  db.prepare("INSERT INTO migrations (id) VALUES (?)").run(1)
  return db
}

describe("migrations", () => {
  it("creates all tables", () => {
    const db = setupDb()
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
    const names = tables.map((t) => t.name)
    expect(names).toContain("projects")
    expect(names).toContain("drafts")
    expect(names).toContain("draft_variants")
    expect(names).toContain("calendar_entries")
    expect(names).toContain("connectors")
    expect(names).toContain("activity_log")
    expect(names).toContain("migrations")
    db.close()
  })

  it("tracks migration as applied", () => {
    const db = setupDb()
    const row = db.prepare("SELECT id FROM migrations WHERE id = 1").get() as { id: number }
    expect(row.id).toBe(1)
    db.close()
  })
})

describe("projects CRUD", () => {
  let db: Database.Database

  beforeEach(() => {
    db = setupDb()
  })

  it("creates and retrieves a project", () => {
    const project = createProject({ name: "test-proj", repo: "https://github.com/test/repo" }, db)
    expect(project.name).toBe("test-proj")
    expect(project.repo).toBe("https://github.com/test/repo")
    expect(project.id).toBeTruthy()

    const fetched = getProject(project.id, db)
    expect(fetched).not.toBeNull()
    expect(fetched!.name).toBe("test-proj")
  })

  it("finds project by name", () => {
    createProject({ name: "by-name", repo: "https://github.com/x/y" }, db)
    const found = getProjectByName("by-name", db)
    expect(found).not.toBeNull()
    expect(found!.repo).toBe("https://github.com/x/y")

    const missing = getProjectByName("nonexistent", db)
    expect(missing).toBeNull()
  })

  it("lists all projects", () => {
    createProject({ name: "p1", repo: "r1" }, db)
    createProject({ name: "p2", repo: "r2" }, db)
    const all = listProjects(db)
    expect(all).toHaveLength(2)
  })

  it("updates a project", () => {
    const project = createProject({ name: "updatable", repo: "r1" }, db)
    updateProject(project.id, { description: "new desc" }, db)
    const updated = getProject(project.id, db)
    expect(updated!.description).toBe("new desc")
  })

  it("deletes a project", () => {
    const project = createProject({ name: "deletable", repo: "r1" }, db)
    deleteProject(project.id, db)
    expect(getProject(project.id, db)).toBeNull()
  })

  it("updates project profile", () => {
    const project = createProject({ name: "profiled", repo: "r1" }, db)
    updateProjectProfile(project.id, '{"languages":["go"]}', db)
    const updated = getProject(project.id, db)
    expect(updated!.profile_json).toBe('{"languages":["go"]}')
  })
})

describe("drafts CRUD", () => {
  let db: Database.Database
  let projectId: string

  beforeEach(() => {
    db = setupDb()
    const project = createProject({ name: "draft-proj", repo: "r1" }, db)
    projectId = project.id
  })

  it("creates a draft with variants and retrieves them", () => {
    const draftId = "draft-1"
    createDraft(
      {
        id: draftId,
        projectId,
        contentType: "feature_highlight",
        framework: "PAS",
        sourceFacts: [{ claim: "fast", source: "bench", confidence: "explicit" }],
      },
      db,
    )

    createDraftVariant(
      {
        id: "var-1",
        draftId,
        platform: "x",
        body: "Check out this feature!",
        hashtags: ["#dev"],
        charCount: 25,
      },
      db,
    )

    const fetched = getDraft(draftId, db)
    expect(fetched).not.toBeNull()
    expect(fetched!.content_type).toBe("feature_highlight")
    expect(fetched!.variants).toHaveLength(1)
    expect(fetched!.variants[0].platform).toBe("x")
    expect(fetched!.variants[0].body).toBe("Check out this feature!")
  })

  it("lists drafts with filters", () => {
    createDraft({ id: "d1", projectId, contentType: "dev_tip", framework: "AIDA" }, db)
    createDraft({ id: "d2", projectId, contentType: "release_announcement", framework: "BAB" }, db)

    const all = listDrafts(undefined, db)
    expect(all).toHaveLength(2)

    const filtered = listDrafts({ contentType: "dev_tip" }, db)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe("d1")
  })

  it("updates draft status", () => {
    createDraft({ id: "d-status", projectId, contentType: "dev_tip", framework: "PAS" }, db)
    updateDraftStatus("d-status", "approved", "2024-01-01T00:00:00Z", db)
    const draft = getDraft("d-status", db)
    expect(draft!.status).toBe("approved")
    expect(draft!.reviewed_at).toBe("2024-01-01T00:00:00Z")
  })

  it("deletes a draft and cascades to variants", () => {
    createDraft({ id: "d-del", projectId, contentType: "dev_tip", framework: "PAS" }, db)
    createDraftVariant({ id: "v-del", draftId: "d-del", platform: "linkedin", body: "test" }, db)
    deleteDraft("d-del", db)
    expect(getDraft("d-del", db)).toBeNull()
    const variants = db.prepare("SELECT * FROM draft_variants WHERE draft_id = ?").all("d-del")
    expect(variants).toHaveLength(0)
  })

  it("gets draft counts", () => {
    createDraft({ id: "c1", projectId, contentType: "dev_tip", framework: "PAS" }, db)
    createDraft({ id: "c2", projectId, contentType: "dev_tip", framework: "PAS" }, db)
    updateDraftStatus("c2", "approved", undefined, db)

    const counts = getDraftCounts(projectId, db)
    expect(counts.pending).toBe(1)
    expect(counts.approved).toBe(1)
    expect(counts.rejected).toBe(0)
    expect(counts.published).toBe(0)
  })
})

describe("calendar CRUD", () => {
  let db: Database.Database
  let projectId: string

  beforeEach(() => {
    db = setupDb()
    const project = createProject({ name: "cal-proj", repo: "r1" }, db)
    projectId = project.id
    createDraft({ id: "cal-draft", projectId, contentType: "dev_tip", framework: "PAS" }, db)
  })

  it("creates and lists calendar entries", () => {
    createCalendarEntry(
      { id: "ce-1", draftId: "cal-draft", projectId, platform: "x", scheduledAt: "2024-06-15T10:00:00Z" },
      db,
    )
    const entries = listCalendarEntries(undefined, db)
    expect(entries).toHaveLength(1)
    expect(entries[0].platform).toBe("x")
  })

  it("filters by month", () => {
    createCalendarEntry(
      { id: "ce-jun", draftId: "cal-draft", projectId, platform: "x", scheduledAt: "2024-06-15T10:00:00Z" },
      db,
    )
    createCalendarEntry(
      { id: "ce-jul", draftId: "cal-draft", projectId, platform: "linkedin", scheduledAt: "2024-07-01T10:00:00Z" },
      db,
    )
    const june = listCalendarEntries({ month: "2024-06" }, db)
    expect(june).toHaveLength(1)
    expect(june[0].id).toBe("ce-jun")
  })

  it("updates and deletes calendar entries", () => {
    createCalendarEntry(
      { id: "ce-upd", draftId: "cal-draft", projectId, platform: "x", scheduledAt: "2024-06-15T10:00:00Z" },
      db,
    )
    updateCalendarEntry("ce-upd", { status: "published" }, db)
    const entries = listCalendarEntries({ status: "published" }, db)
    expect(entries).toHaveLength(1)

    deleteCalendarEntry("ce-upd", db)
    expect(listCalendarEntries(undefined, db)).toHaveLength(0)
  })
})

describe("activity log", () => {
  let db: Database.Database
  let projectId: string

  beforeEach(() => {
    db = setupDb()
    const project = createProject({ name: "act-proj", repo: "r1" }, db)
    projectId = project.id
  })

  it("logs and retrieves activity", () => {
    logActivity(projectId, "project.created", { name: "act-proj" }, db)
    logActivity(null, "system.startup", {}, db)

    const all = getActivity(undefined, db)
    expect(all).toHaveLength(2)

    const filtered = getActivity({ projectId }, db)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].action).toBe("project.created")
  })

  it("respects limit", () => {
    for (let i = 0; i < 10; i++) {
      logActivity(projectId, `action.${i}`, {}, db)
    }
    const limited = getActivity({ limit: 3 }, db)
    expect(limited).toHaveLength(3)
  })
})
