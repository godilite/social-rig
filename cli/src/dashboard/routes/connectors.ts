import { Hono } from "hono"
import { getAllConnectors, getConnector } from "../../connectors/registry.js"

const app = new Hono()

app.get("/", (c) => {
  const connectors = getAllConnectors().map((conn) => ({
    id: conn.id,
    name: conn.name,
    capabilities: conn.capabilities,
  }))
  return c.json(connectors)
})

app.get("/:id/capabilities", (c) => {
  const connector = getConnector(c.req.param("id"))
  if (!connector) return c.json({ error: "Connector not found" }, 404)
  return c.json(connector.capabilities)
})

export default app
