import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const originalEnv = { ...process.env }

beforeEach(() => {
  delete process.env.OPENAI_API_KEY
  delete process.env.ANTHROPIC_API_KEY
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("no ollama")))
})

afterEach(() => {
  process.env = { ...originalEnv }
  vi.restoreAllMocks()
})

describe("detectProviders", () => {
  it("detects OPENAI_API_KEY", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key"
    const { detectProviders } = await import("./detect.js")

    const providers = await detectProviders()

    const openai = providers.find((p) => p.name === "openai")
    expect(openai).toBeDefined()
    expect(openai!.source).toBe("env:OPENAI_API_KEY")
    expect(openai!.model).toBe("gpt-4o")
    expect(openai!.isLocal).toBe(false)
  })

  it("detects ANTHROPIC_API_KEY", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key"
    const { detectProviders } = await import("./detect.js")

    const providers = await detectProviders()

    const anthropic = providers.find((p) => p.name === "anthropic")
    expect(anthropic).toBeDefined()
    expect(anthropic!.source).toBe("env:ANTHROPIC_API_KEY")
    expect(anthropic!.isLocal).toBe(false)
  })

  it("returns empty for env providers when no keys set", async () => {
    const { detectProviders } = await import("./detect.js")

    const providers = await detectProviders()

    const envProviders = providers.filter(
      (p) => p.name === "openai" || p.name === "anthropic",
    )
    expect(envProviders).toHaveLength(0)
  })

  it("detects both providers when both keys set", async () => {
    process.env.OPENAI_API_KEY = "sk-openai"
    process.env.ANTHROPIC_API_KEY = "sk-anthropic"
    const { detectProviders } = await import("./detect.js")

    const providers = await detectProviders()

    const names = providers.map((p) => p.name)
    expect(names).toContain("openai")
    expect(names).toContain("anthropic")
  })

  it("lists openai before anthropic in priority", async () => {
    process.env.OPENAI_API_KEY = "sk-openai"
    process.env.ANTHROPIC_API_KEY = "sk-anthropic"
    const { detectProviders } = await import("./detect.js")

    const providers = await detectProviders()

    const openaiIdx = providers.findIndex((p) => p.name === "openai")
    const anthropicIdx = providers.findIndex((p) => p.name === "anthropic")
    expect(openaiIdx).toBeLessThan(anthropicIdx)
  })
})
