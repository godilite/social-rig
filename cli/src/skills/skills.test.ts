import { describe, it, expect } from "vitest"
import { buildSkillContext } from "./index.js"
import { getHooksForContent, getPlatformRules } from "./social-content.js"
import { getCopywritingSlice } from "./copywriting.js"
import { getPsychPrinciples } from "./psychology.js"
import type { ContentType, Platform } from "../types.js"

describe("buildSkillContext", () => {
  const ALL_CONTENT_TYPES: ContentType[] = [
    "feature_highlight",
    "release_announcement",
    "dev_tip",
    "behind_the_scenes",
    "tutorial_teaser",
    "milestone_celebration",
  ]

  const ALL_PLATFORMS: Platform[] = ["x", "linkedin", "devto", "hashnode", "bluesky", "mastodon", "reddit"]

  it("returns a non-empty string for every content type and platform combination", () => {
    for (const ct of ALL_CONTENT_TYPES) {
      for (const p of ALL_PLATFORMS) {
        const ctx = buildSkillContext(ct, p)
        expect(ctx.length).toBeGreaterThan(100)
      }
    }
  })

  it("includes platform rules in output", () => {
    const ctx = buildSkillContext("feature_highlight", "x")
    expect(ctx).toContain("[Platform: x]")
    expect(ctx).toContain("280 characters")
  })

  it("includes hook formulas", () => {
    const ctx = buildSkillContext("dev_tip", "linkedin")
    expect(ctx).toContain("[Hook formulas")
  })

  it("includes copywriting rules", () => {
    const ctx = buildSkillContext("release_announcement", "linkedin")
    expect(ctx).toContain("[Copywriting rules]")
    expect(ctx).toContain("Clarity over cleverness")
  })

  it("includes psychology principles", () => {
    const ctx = buildSkillContext("feature_highlight", "x")
    expect(ctx).toContain("[Psychology principles")
  })

  it("includes headline formulas for long-form platforms", () => {
    const ctx = buildSkillContext("feature_highlight", "linkedin")
    expect(ctx).toContain("[Headline formulas]")
  })

  it("omits headline formulas for short-form platforms", () => {
    const ctx = buildSkillContext("feature_highlight", "x")
    expect(ctx).not.toContain("[Headline formulas]")
  })

  it("produces shorter context for short-form platforms", () => {
    const short = buildSkillContext("dev_tip", "x")
    const long = buildSkillContext("dev_tip", "linkedin")
    expect(short.length).toBeLessThan(long.length)
  })
})

describe("social-content", () => {
  it("returns hooks for every content type", () => {
    const types: ContentType[] = ["feature_highlight", "release_announcement", "dev_tip", "behind_the_scenes", "tutorial_teaser", "milestone_celebration"]
    for (const ct of types) {
      const hooks = getHooksForContent(ct)
      expect(hooks.length).toBeGreaterThan(0)
    }
  })

  it("returns platform rules for every platform", () => {
    const platforms: Platform[] = ["x", "linkedin", "devto", "hashnode", "bluesky", "mastodon", "reddit"]
    for (const p of platforms) {
      const rules = getPlatformRules(p)
      expect(rules.length).toBeGreaterThan(0)
    }
  })
})

describe("copywriting", () => {
  it("returns fewer principles for short-form", () => {
    const short = getCopywritingSlice(true)
    const long = getCopywritingSlice(false)
    expect(short.principles.length).toBeLessThanOrEqual(long.principles.length)
  })

  it("always includes core principles", () => {
    const slice = getCopywritingSlice(true)
    expect(slice.principles.length).toBeGreaterThan(0)
    expect(slice.style.length).toBeGreaterThan(0)
  })
})

describe("psychology", () => {
  it("returns principles for every content type", () => {
    const types: ContentType[] = ["feature_highlight", "release_announcement", "dev_tip", "behind_the_scenes", "tutorial_teaser", "milestone_celebration"]
    for (const ct of types) {
      const principles = getPsychPrinciples(ct)
      expect(principles.length).toBeGreaterThan(0)
      for (const p of principles) {
        expect(p.name).toBeTruthy()
        expect(p.application).toBeTruthy()
      }
    }
  })

  it("returns different principles for different content types", () => {
    const featureP = getPsychPrinciples("feature_highlight").map((p) => p.name)
    const behindP = getPsychPrinciples("behind_the_scenes").map((p) => p.name)
    const overlap = featureP.filter((n) => behindP.includes(n))
    expect(overlap.length).toBeLessThan(featureP.length)
  })
})
