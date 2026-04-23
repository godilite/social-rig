import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { mkdirSync, writeFileSync, existsSync, unlinkSync, rmSync } from "node:fs"
import { join, resolve } from "node:path"
import { tmpdir } from "node:os"
import { nanoid } from "nanoid"

import {
  buildImagePrompt,
  createImageGenerator,
  attachImageFile,
  removeImage,
  resolveImageFilename,
  saveGeneratedImage,
} from "./images.js"
import type { ImageConfig, ContentType, ProjectProfile } from "../types.js"

const TEST_DIR = join(tmpdir(), `social-rig-img-test-${nanoid(6)}`)
const IMAGES_DIR = join(TEST_DIR, ".social-rig", "images")

function testProfile(): ProjectProfile {
  return {
    name: "test-project",
    description: "A test project",
    languages: ["TypeScript", "Go"],
    frameworks: ["React"],
    recentChanges: [],
    features: [],
    stats: { contributors: 1, age: "1y", languages: {}, topics: [] },
    techStack: ["Node.js"],
  }
}

function testConfig(overrides?: Partial<ImageConfig>): ImageConfig {
  return {
    enabled: true,
    provider: "openai",
    style: "minimal-tech",
    brandColors: { primary: "#6366f1", background: "#0f172a" },
    ...overrides,
  }
}

describe("buildImagePrompt", () => {
  it("builds prompt for feature_highlight", () => {
    const prompt = buildImagePrompt("feature_highlight", "New auth system", testProfile(), testConfig())

    expect(prompt.type).toBe("feature_visual")
    expect(prompt.headline).toBe("New auth system")
    expect(prompt.description).toContain("test-project")
    expect(prompt.description).toContain("TypeScript and Go")
    expect(prompt.style).toBe("minimal-tech")
    expect(prompt.brandColors.primary).toBe("#6366f1")
  })

  it("builds prompt for release_announcement", () => {
    const prompt = buildImagePrompt("release_announcement", "v2.0 launch", testProfile(), testConfig())
    expect(prompt.type).toBe("og_card")
  })

  it("builds prompt for dev_tip", () => {
    const prompt = buildImagePrompt("dev_tip", "Better caching", testProfile(), testConfig())
    expect(prompt.type).toBe("abstract_mood")
  })

  it("uses config brand colors", () => {
    const prompt = buildImagePrompt(
      "feature_highlight",
      "test",
      testProfile(),
      testConfig({ brandColors: { primary: "#ff0000", background: "#000000" } }),
    )
    expect(prompt.brandColors.primary).toBe("#ff0000")
    expect(prompt.brandColors.background).toBe("#000000")
  })

  it("handles profile with no languages", () => {
    const profile = testProfile()
    profile.languages = []
    const prompt = buildImagePrompt("feature_highlight", "test", profile, testConfig())
    expect(prompt.description).toContain("test-project")
  })
})

describe("createImageGenerator", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("returns null when disabled", () => {
    const result = createImageGenerator(testConfig({ enabled: false }))
    expect(result.generator).toBeNull()
    expect(result.warning).toBeUndefined()
  })

  it("returns warning when openai key missing", () => {
    delete process.env.OPENAI_API_KEY
    const result = createImageGenerator(testConfig({ provider: "openai" }))
    expect(result.generator).toBeNull()
    expect(result.warning).toContain("OPENAI_API_KEY")
  })

  it("returns warning when stability key missing", () => {
    delete process.env.STABILITY_API_KEY
    delete process.env.STABILITY_KEY
    const result = createImageGenerator(testConfig({ provider: "stability" }))
    expect(result.generator).toBeNull()
    expect(result.warning).toContain("STABILITY_API_KEY")
  })

  it("creates openai generator when key present", () => {
    process.env.OPENAI_API_KEY = "test-key-123"
    const result = createImageGenerator(testConfig({ provider: "openai" }))
    expect(result.generator).not.toBeNull()
    expect(result.generator!.name).toBe("openai-dalle-3")
  })

  it("creates stability generator when key present", () => {
    process.env.STABILITY_API_KEY = "test-key-456"
    const result = createImageGenerator(testConfig({ provider: "stability" }))
    expect(result.generator).not.toBeNull()
    expect(result.generator!.name).toBe("stability-sd3")
  })

  it("creates local generator without key", () => {
    const result = createImageGenerator(testConfig({ provider: "local" }))
    expect(result.generator).not.toBeNull()
    expect(result.generator!.name).toBe("local-stable-diffusion")
  })

  it("returns warning for unknown provider", () => {
    const result = createImageGenerator(testConfig({ provider: "midjourney" }))
    expect(result.generator).toBeNull()
    expect(result.warning).toContain("Unknown image provider")
  })
})

describe("saveGeneratedImage", () => {
  const cwd = process.cwd()

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true })
    process.chdir(TEST_DIR)
  })

  afterEach(() => {
    process.chdir(cwd)
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  it("saves image to .social-rig/images/", async () => {
    const image = {
      buffer: Buffer.from("fake-png-data"),
      format: "png" as const,
      width: 1024,
      height: 1024,
    }

    const path = await saveGeneratedImage("test-draft-1", image)
    expect(path).toContain("test-draft-1.png")
    expect(existsSync(path)).toBe(true)
  })
})

describe("attachImageFile", () => {
  const cwd = process.cwd()
  let tempSource: string

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true })
    process.chdir(TEST_DIR)
    tempSource = join(tmpdir(), `social-rig-test-src-${nanoid(6)}.png`)
    writeFileSync(tempSource, Buffer.from("fake-image"))
  })

  afterEach(() => {
    process.chdir(cwd)
    rmSync(TEST_DIR, { recursive: true, force: true })
    try { unlinkSync(tempSource) } catch {}
  })

  it("copies file to images directory", () => {
    const path = attachImageFile("draft-abc", tempSource)
    expect(path).toContain("draft-abc.png")
    expect(existsSync(path)).toBe(true)
  })

  it("throws for missing source file", () => {
    expect(() => attachImageFile("draft-abc", "/nonexistent/file.png")).toThrow("File not found")
  })

  it("throws for oversized file", () => {
    const bigFile = join(tmpdir(), `social-rig-big-${nanoid(6)}.png`)
    writeFileSync(bigFile, Buffer.alloc(11 * 1024 * 1024))
    try {
      expect(() => attachImageFile("draft-abc", bigFile)).toThrow("too large")
    } finally {
      unlinkSync(bigFile)
    }
  })
})

describe("removeImage", () => {
  it("removes existing file", () => {
    const tempFile = join(tmpdir(), `social-rig-rm-${nanoid(6)}.png`)
    writeFileSync(tempFile, "data")
    expect(existsSync(tempFile)).toBe(true)

    removeImage(tempFile)
    expect(existsSync(tempFile)).toBe(false)
  })

  it("does not throw for missing file", () => {
    expect(() => removeImage("/nonexistent/path.png")).not.toThrow()
  })
})

describe("resolveImageFilename", () => {
  const cwd = process.cwd()

  beforeEach(() => {
    mkdirSync(IMAGES_DIR, { recursive: true })
    process.chdir(TEST_DIR)
    writeFileSync(join(IMAGES_DIR, "draft-123.png"), "data")
  })

  afterEach(() => {
    process.chdir(cwd)
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  it("resolves valid filename", () => {
    const result = resolveImageFilename("draft-123.png")
    expect(result).toContain("draft-123.png")
  })

  it("rejects path traversal", () => {
    expect(resolveImageFilename("../etc/passwd")).toBeNull()
    expect(resolveImageFilename("../../secret.png")).toBeNull()
  })

  it("rejects nonexistent file", () => {
    expect(resolveImageFilename("nonexistent.png")).toBeNull()
  })

  it("rejects filenames with special characters", () => {
    expect(resolveImageFilename("file name with spaces.png")).toBeNull()
  })
})
