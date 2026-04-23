import { Hono } from "hono"
import { listProjects, getProject, createProject, updateProject, deleteProject } from "../../db/projects.js"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { parse, stringify } from "yaml"
import { dirname, resolve } from "node:path"

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

app.post("/", async (c) => {
  const body = await c.req.json<{ name: string; repo: string; description?: string }>()

  if (!body.name?.trim()) return c.json({ error: "Project name is required" }, 400)
  if (!body.repo?.trim()) return c.json({ error: "Repository path is required" }, 400)

  const repoPath = resolve(body.repo)
  const configPath = resolve(repoPath, ".social-rig", "config.yaml")

  try {
    const project = createProject({
      name: body.name.trim(),
      repo: body.repo.trim(),
      description: body.description?.trim(),
      configPath,
    })

    const configDir = dirname(configPath)
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true })
    }

    if (!existsSync(configPath)) {
      const defaultConfig = {
        project: { name: body.name.trim(), repo: body.repo.trim(), description: body.description?.trim() ?? "" },
        voice: { tone: "witty-technical", audience: "developers", avoid: [] },
        ai: { provider: "auto", model: "", apiKeySource: "" },
        images: { enabled: false, provider: "openai", style: "minimal-tech", brandColors: { primary: "#6366f1", background: "#0f172a" } },
        content: { types: ["feature_highlight", "release_announcement", "dev_tip"], batchSize: 5, platforms: ["x", "linkedin"] },
        connectors: { builtin: ["x", "linkedin"], community: [] },
      }
      writeFileSync(configPath, stringify(defaultConfig, { lineWidth: 120 }), "utf-8")
    }

    return c.json(project, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    if (msg.includes("UNIQUE")) return c.json({ error: "A project with that name already exists" }, 409)
    return c.json({ error: msg }, 500)
  }
})

app.patch("/:id", async (c) => {
  const id = c.req.param("id")
  const project = getProject(id)
  if (!project) return c.json({ error: "Project not found" }, 404)

  const body = await c.req.json<{ name?: string; repo?: string; description?: string }>()

  const updates: Record<string, string> = {}
  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.repo !== undefined) updates.repo = body.repo.trim()
  if (body.description !== undefined) updates.description = body.description.trim()

  if (Object.keys(updates).length === 0) return c.json({ error: "No fields to update" }, 400)

  try {
    updateProject(id, updates)

    if (body.repo && project.config_path) {
      const newConfigPath = resolve(body.repo.trim(), ".social-rig", "config.yaml")
      updateProject(id, { config_path: newConfigPath })
    }

    return c.json(getProject(id))
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    if (msg.includes("UNIQUE")) return c.json({ error: "A project with that name already exists" }, 409)
    return c.json({ error: msg }, 500)
  }
})

app.delete("/:id", (c) => {
  const id = c.req.param("id")
  const project = getProject(id)
  if (!project) return c.json({ error: "Project not found" }, 404)

  deleteProject(id)
  return c.json({ ok: true })
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
