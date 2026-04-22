import { Hono } from "hono"
import { getAllConnectors } from "../../connectors/registry.js"

const app = new Hono()

app.get("/", (c) => {
  const plugins = getAllConnectors().map((conn) => ({
    id: conn.id,
    name: conn.name,
    capabilities: conn.capabilities,
  }))
  return c.json(plugins)
})

export default app
