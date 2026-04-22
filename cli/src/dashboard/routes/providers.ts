import { Hono } from "hono"
import { detectProviders } from "../../ai/detect.js"

const app = new Hono()

app.get("/", async (c) => {
  const providers = await detectProviders()
  return c.json(
    providers.map((p) => ({
      name: p.name,
      source: p.source,
      type: p.type,
      model: p.model ?? null,
      isLocal: p.isLocal,
      models: p.models ?? [],
    })),
  )
})

export default app
