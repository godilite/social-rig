import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { detectProviders, clearProviderCache } from "./detect.js"

vi.mock("./subprocess.js", () => ({
  commandExists: vi.fn().mockResolvedValue(false),
}))

vi.mock("./local-servers.js", () => ({
  detectLocalServers: vi.fn().mockResolvedValue([]),
}))

vi.mock("./parasite.js", () => ({
  extractParasitedCredentials: vi.fn().mockResolvedValue([]),
}))

const originalEnv = { ...process.env }

beforeEach(() => {
  delete process.env.OPENAI_API_KEY
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.GOOGLE_API_KEY
  clearProviderCache()
})

afterEach(() => {
  process.env = { ...originalEnv }
  vi.restoreAllMocks()
})

describe("detectProviders", () => {
  it("detects OPENAI_API_KEY", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key"

    const providers = await detectProviders(true)

    const openai = providers.find((p) => p.name === "openai")
    expect(openai).toBeDefined()
    expect(openai!.source).toBe("env:OPENAI_API_KEY")
    expect(openai!.model).toBe("gpt-4o")
    expect(openai!.isLocal).toBe(false)
    expect(openai!.type).toBe("cloud")
  })

  it("detects ANTHROPIC_API_KEY", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key"

    const providers = await detectProviders(true)

    const anthropic = providers.find((p) => p.name === "anthropic")
    expect(anthropic).toBeDefined()
    expect(anthropic!.source).toBe("env:ANTHROPIC_API_KEY")
    expect(anthropic!.isLocal).toBe(false)
    expect(anthropic!.type).toBe("cloud")
  })

  it("returns empty for env providers when no keys set", async () => {
    const providers = await detectProviders(true)

    const envProviders = providers.filter(
      (p) => p.name === "openai" || p.name === "anthropic",
    )
    expect(envProviders).toHaveLength(0)
  })

  it("detects both providers when both keys set", async () => {
    process.env.OPENAI_API_KEY = "sk-openai"
    process.env.ANTHROPIC_API_KEY = "sk-anthropic"

    const providers = await detectProviders(true)

    const names = providers.map((p) => p.name)
    expect(names).toContain("openai")
    expect(names).toContain("anthropic")
  })

  it("ranks cloud providers after local", async () => {
    process.env.OPENAI_API_KEY = "sk-openai"
    process.env.ANTHROPIC_API_KEY = "sk-anthropic"

    const providers = await detectProviders(true)

    const cloudProviders = providers.filter((p) => p.type === "cloud")
    const cliProviders = providers.filter((p) => p.type === "cli")

    if (cliProviders.length > 0) {
      const firstCli = providers.indexOf(cliProviders[0])
      const firstCloud = providers.indexOf(cloudProviders[0])
      expect(firstCli).toBeLessThan(firstCloud)
    }
  })
})
