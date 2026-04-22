import { Hono } from "hono"
import { listProjects, getProject } from "../../db/projects.js"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { parse, stringify } from "yaml"
import { dirname } from "node:path"

const app = new Hono()

app.get("/", (c) => {
  const projects = listProjects()
  return c.json(projects)
})

app.get("/:id", (c) => {
  const project = getProject(c.req.param("id"))
  if (!project) return c.json({ error: "Project not found" }, 404)

  let config = null
  if (project.config_path && existsSync(project.config_path)) {
    try {
      const raw = readFileSync(project.config_path, "utf-8")
      config = parse(raw)
    } catch {
      config = null
    }
  }

  return c.json({ ...project, config })
})

app.put("/:id/config", async (c) => {
  const project = getProject(c.req.param("id"))
  if (!project) return c.json({ error: "Project not found" }, 404)
  if (!project.config_path) return c.json({ error: "No config path set" }, 400)

  const body = await c.req.json()

  try {
    const dir = dirname(project.config_path)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(project.config_path, stringify(body, { lineWidth: 120 }), "utf-8")
    return c.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return c.json({ error: `Failed to save config: ${msg}` }, 500)
  }
})

export default app
