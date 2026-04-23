import { describe, it, expect, beforeEach } from "vitest"
import { selectFramework, applyFramework, resetFrameworkCounter } from "./frameworks.js"
import type { FrameworkContext } from "./frameworks.js"
import type { ContentType, CopyFramework } from "../types.js"

const baseContext: FrameworkContext = {
  projectName: "TestApp",
  feature: "auto-deploy",
  audience: "developers",
  tone: "casual",
  platform: "x",
}

describe("selectFramework", () => {
  beforeEach(() => {
    resetFrameworkCounter()
  })

  it("first call for feature_highlight returns PAS", () => {
    expect(selectFramework("feature_highlight")).toBe("PAS")
  })

  it("first call for release_announcement returns AIDA", () => {
    expect(selectFramework("release_announcement")).toBe("AIDA")
  })

  it("first call for dev_tip returns BAB", () => {
    expect(selectFramework("dev_tip")).toBe("BAB")
  })

  it("rotates through frameworks on repeated calls", () => {
    const first = selectFramework("dev_tip")
    const second = selectFramework("dev_tip")
    const third = selectFramework("dev_tip")

    expect(first).toBe("BAB")
    expect(second).toBe("PAS")
    expect(third).toBe("AIDA")
  })

  it("cycles back after exhausting all frameworks", () => {
    selectFramework("feature_highlight")
    selectFramework("feature_highlight")
    selectFramework("feature_highlight")
    const fourth = selectFramework("feature_highlight")
    expect(fourth).toBe("PAS")
  })

  it("returns a valid framework for every content type", () => {
    const allTypes: ContentType[] = [
      "feature_highlight", "release_announcement", "dev_tip",
      "behind_the_scenes", "tutorial_teaser", "milestone_celebration",
    ]
    const validFrameworks: CopyFramework[] = ["PAS", "AIDA", "BAB"]

    for (const type of allTypes) {
      expect(validFrameworks).toContain(selectFramework(type))
    }
  })
})

describe("applyFramework", () => {
  it("PAS returns non-empty systemInstructions and 3-part structure", () => {
    const prompt = applyFramework("PAS", baseContext)

    expect(prompt.systemInstructions).toBeTruthy()
    expect(prompt.systemInstructions.length).toBeGreaterThan(50)
    expect(prompt.structure).toHaveLength(3)
    expect(prompt.systemInstructions).toContain("Problem-Agitate-Solution")
  })

  it("AIDA returns non-empty systemInstructions and 4-part structure", () => {
    const prompt = applyFramework("AIDA", baseContext)

    expect(prompt.systemInstructions).toBeTruthy()
    expect(prompt.structure).toHaveLength(4)
    expect(prompt.systemInstructions).toContain("AIDA")
  })

  it("BAB returns non-empty systemInstructions and 3-part structure", () => {
    const prompt = applyFramework("BAB", baseContext)

    expect(prompt.systemInstructions).toBeTruthy()
    expect(prompt.structure).toHaveLength(3)
    expect(prompt.systemInstructions).toContain("Before-After-Bridge")
  })

  it("includes project name in system instructions", () => {
    const frameworks: CopyFramework[] = ["PAS", "AIDA", "BAB"]

    for (const fw of frameworks) {
      const prompt = applyFramework(fw, baseContext)
      expect(prompt.systemInstructions).toContain("TestApp")
    }
  })

  it("includes audience and tone in system instructions", () => {
    const prompt = applyFramework("PAS", baseContext)

    expect(prompt.systemInstructions).toContain("developers")
    expect(prompt.systemInstructions).toContain("casual")
  })

  it("includes platform in system instructions", () => {
    const prompt = applyFramework("AIDA", { ...baseContext, platform: "linkedin" })

    expect(prompt.systemInstructions).toContain("linkedin")
  })

  it("each framework includes an example", () => {
    const frameworks: CopyFramework[] = ["PAS", "AIDA", "BAB"]

    for (const fw of frameworks) {
      const prompt = applyFramework(fw, baseContext)
      expect(prompt.example).toBeTruthy()
      expect(prompt.example!.length).toBeGreaterThan(20)
    }
  })
})
