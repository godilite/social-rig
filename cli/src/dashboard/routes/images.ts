import { Hono } from "hono"
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join, extname, basename } from "node:path"
import { tmpdir } from "node:os"
import { nanoid } from "nanoid"
import { getDraft, updateDraftImagePath } from "../../db/drafts.js"
import { resolveImageFilename, getImagesDir, removeImage, attachImageUrl } from "../../generator/images.js"
import { logActivity } from "../../db/activity.js"

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
}

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024

const app = new Hono()

app.get("/:filename", (c) => {
  const filename = c.req.param("filename")
  const filepath = resolveImageFilename(filename)

  if (!filepath) {
    return c.json({ error: "Image not found" }, 404)
  }

  const ext = extname(filepath).toLowerCase()
  const mime = MIME_MAP[ext] ?? "application/octet-stream"
  const content = readFileSync(filepath)

  return new Response(content, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=3600",
    },
  })
})

app.post("/upload/:draftId", async (c) => {
  const draftId = c.req.param("draftId")

  const draft = getDraft(draftId)
  if (!draft) {
    return c.json({ error: "Draft not found" }, 404)
  }

  const contentType = c.req.header("content-type") ?? ""

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData()
    const file = formData.get("image")

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No image file provided" }, 400)
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return c.json({ error: `File too large. Max: ${MAX_UPLOAD_SIZE} bytes.` }, 400)
    }

    const fileMime = file.type
    if (!Object.values(MIME_MAP).includes(fileMime)) {
      return c.json({ error: `Invalid file type: ${fileMime}` }, 400)
    }

    if (draft.image_path) {
      removeImage(draft.image_path)
    }

    const ext = Object.entries(MIME_MAP).find(([_, m]) => m === fileMime)?.[0] ?? ".png"
    const imagesDir = getImagesDir()
    mkdirSync(imagesDir, { recursive: true })

    const filename = `${draftId}${ext}`
    const filepath = join(imagesDir, filename)

    const arrayBuffer = await file.arrayBuffer()
    writeFileSync(filepath, Buffer.from(arrayBuffer))

    updateDraftImagePath(draftId, filepath)
    logActivity(draft.project_id, "image_uploaded", { draftId })

    return c.json({ imagePath: filepath, filename })
  }

  if (contentType.includes("application/json")) {
    const body = await c.req.json<{ url?: string }>()
    if (!body.url) {
      return c.json({ error: "No URL provided" }, 400)
    }

    if (draft.image_path) {
      removeImage(draft.image_path)
    }

    try {
      const imagePath = await attachImageUrl(draftId, body.url)
      updateDraftImagePath(draftId, imagePath)
      logActivity(draft.project_id, "image_added_url", { draftId })

      const filename = basename(imagePath)
      return c.json({ imagePath, filename })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return c.json({ error: message }, 400)
    }
  }

  return c.json({ error: "Unsupported content type" }, 400)
})

app.delete("/:draftId", (c) => {
  const draftId = c.req.param("draftId")

  const draft = getDraft(draftId)
  if (!draft) {
    return c.json({ error: "Draft not found" }, 404)
  }

  if (!draft.image_path) {
    return c.json({ ok: true })
  }

  removeImage(draft.image_path)
  updateDraftImagePath(draftId, null)
  logActivity(draft.project_id, "image_removed", { draftId })

  return c.json({ ok: true })
})

export default app
