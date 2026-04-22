import { Hono } from "hono"
import { getDraftCounts } from "../../db/drafts.js"
import { listProjects } from "../../db/projects.js"
import { getActivity } from "../../db/activity.js"
import { getAllConnectors } from "../../connectors/registry.js"

const app = new Hono()

app.get("/stats", (c) => {
  const projectId = c.req.query("projectId")
  const drafts = getDraftCounts(projectId)
  const projects = listProjects().length
  const connectors = getAllConnectors().length

  return c.json({ drafts, projects, connectors })
})

app.get("/activity", (c) => {
  const projectId = c.req.query("projectId")
  const limit = parseInt(c.req.query("limit") ?? "20", 10)

  const activity = getActivity({ projectId, limit })
  return c.json(activity)
})

export default app
