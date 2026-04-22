import { Hono } from "hono"
import { listProjects, getProject } from "../../db/projects.js"
import { loadConfig, saveConfig } from "../../config/loader.js"

const app = new Hono()

app.get("/", (c) => {
  const projects = listProjects()
  return c.json(projects)
})

app.get("/:id", (c) => {
  const project = getProject(c.req.param("id"))
  if (!project) return c.json({ error: "Project not found" }, 404)

  let config = null
  if (project.config_path) {
    try {
      config = loadConfig(project.config_path)
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
    saveConfig(project.config_path, body)
    return c.json({ ok: true })
  } catch {
    return c.json({ error: "Failed to save config" }, 500)
  }
})

export default app
