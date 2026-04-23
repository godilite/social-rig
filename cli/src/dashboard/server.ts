import { Hono } from "hono"
import { cors } from "hono/cors"
import { serve } from "@hono/node-server"
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs"
import { join, dirname, extname } from "node:path"
import { fileURLToPath } from "node:url"
import chalk from "chalk"

import draftsRoutes from "./routes/drafts.js"
import projectsRoutes from "./routes/projects.js"
import calendarRoutes from "./routes/calendar.js"
import statsRoutes from "./routes/stats.js"
import connectorsRoutes from "./routes/connectors.js"
import pluginsRoutes from "./routes/plugins.js"
import providersRoutes from "./routes/providers.js"
import imagesRoutes from "./routes/images.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
}

function resolveUiDistDir(): string | null {
  const candidates = [
    join(__dirname, "ui", "dist"),
    join(__dirname, "..", "src", "dashboard", "ui", "dist"),
    join(process.cwd(), "src", "dashboard", "ui", "dist"),
  ]
  for (const dir of candidates) {
    if (existsSync(join(dir, "index.html"))) return dir
  }
  return null
}

function createApp(): Hono {
  const app = new Hono()

  app.use("*", cors())

  app.route("/api/drafts", draftsRoutes)
  app.route("/api/projects", projectsRoutes)
  app.route("/api/calendar", calendarRoutes)
  app.route("/api", statsRoutes)
  app.route("/api/connectors", connectorsRoutes)
  app.route("/api/plugins", pluginsRoutes)
  app.route("/api/providers", providersRoutes)
  app.route("/api/images", imagesRoutes)

  const uiDistDir = resolveUiDistDir()

  if (uiDistDir) {
    app.get("*", (c) => {
      const reqPath = c.req.path === "/" ? "/index.html" : c.req.path
      const filePath = join(uiDistDir, reqPath)

      if (existsSync(filePath) && statSync(filePath).isFile()) {
        const ext = extname(filePath)
        const mime = MIME_TYPES[ext] ?? "application/octet-stream"
        const content = readFileSync(filePath)
        return new Response(content, { headers: { "Content-Type": mime } })
      }

      const indexPath = join(uiDistDir, "index.html")
      if (existsSync(indexPath)) {
        const html = readFileSync(indexPath, "utf-8")
        return c.html(html)
      }

      return c.text("Not found", 404)
    })
  } else {
    app.get("/", (c) => {
      return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>social-rig dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .container { text-align: center; }
    h1 { font-size: 2rem; color: #6366f1; margin-bottom: 0.5rem; }
    p { color: #94a3b8; }
    .status { margin-top: 1.5rem; padding: 1rem 2rem; background: #1e293b; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>social-rig</h1>
    <p>Marketing dashboard</p>
    <div class="status">
      <p>API is running. Build the UI with:</p>
      <pre style="margin-top:0.5rem;color:#94a3b8">cd src/dashboard/ui && npm run build</pre>
    </div>
  </div>
</body>
</html>`)
    })
  }

  return app
}

interface DashboardOptions {
  port: number
  openBrowser: boolean
}

export async function startDashboard(options: DashboardOptions) {
  const app = createApp()
  const url = `http://localhost:${options.port}`

  console.log(chalk.bold(`\n  social-rig dashboard\n`))
  console.log(`  ${chalk.dim("Local:")}   ${chalk.cyan(url)}`)

  serve({ fetch: app.fetch, port: options.port })

  if (options.openBrowser) {
    const openModule = await import("open")
    await openModule.default(url)
  }
}
