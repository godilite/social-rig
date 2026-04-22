import { describe, it, expect } from "vitest"
import { buildContentPlan } from "./strategy.js"
import type { ProjectProfile, ContentType, Platform } from "../types.js"

function makeProfile(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    name: "test-project",
    description: "A test project",
    languages: ["TypeScript"],
    frameworks: ["Hono"],
    recentChanges: [],
    features: [],
    stats: {
      stars: 0,
      forks: 0,
      watchers: 0,
      contributors: 1,
      age: "6 months",
      languages: {},
      topics: [],
    },
    techStack: ["TypeScript", "Hono"],
    ...overrides,
  }
}

const defaultConfig = {
  types: [
    "feature_highlight", "release_announcement", "dev_tip",
    "behind_the_scenes", "tutorial_teaser", "milestone_celebration",
  ] as ContentType[],
  platforms: ["x", "linkedin"] as Platform[],
  batchSize: 10,
}

describe("buildContentPlan", () => {
  it("triggers release_announcement when releases exist", () => {
    const profile = makeProfile({
      recentChanges: [
        { type: "release", title: "v2.0.0", date: "2024-06-01" },
      ],
    })

    const plan = buildContentPlan(profile, defaultConfig)

    const types = plan.items.map((i) => i.type)
    expect(types).toContain("release_announcement")
  })

  it("triggers feature_highlight when features exist", () => {
    const profile = makeProfile({
      features: [
        { claim: "Supports hot reload", source: "README", confidence: "explicit" },
      ],
    })

    const plan = buildContentPlan(profile, defaultConfig)

    const types = plan.items.map((i) => i.type)
    expect(types).toContain("feature_highlight")
  })

  it("triggers behind_the_scenes when commit count is high", () => {
    const commits = Array.from({ length: 25 }, (_, i) => ({
      type: "commit" as const,
      title: `feat: change ${i}`,
      date: "2024-06-01",
    }))
    const profile = makeProfile({ recentChanges: commits })

    const plan = buildContentPlan(profile, defaultConfig)

    const types = plan.items.map((i) => i.type)
    expect(types).toContain("behind_the_scenes")
  })

  it("respects batchSize limit", () => {
    const features = Array.from({ length: 5 }, (_, i) => ({
      claim: `Feature ${i}`,
      source: "README",
      confidence: "explicit" as const,
    }))
    const profile = makeProfile({
      features,
      recentChanges: [{ type: "release" as const, title: "v1.0.0", date: "2024-06-01" }],
    })

    const plan = buildContentPlan(profile, { ...defaultConfig, batchSize: 2 })

    expect(plan.items.length).toBeLessThanOrEqual(2)
  })

  it("produces a dev_tip even with empty profile", () => {
    const profile = makeProfile()

    const plan = buildContentPlan(profile, defaultConfig)

    expect(plan.items.length).toBeGreaterThan(0)
    const types = plan.items.map((i) => i.type)
    expect(types).toContain("dev_tip")
  })

  it("assigns correct frameworks to content types", () => {
    const profile = makeProfile({
      features: [
        { claim: "Fast builds", source: "bench", confidence: "explicit" },
      ],
      recentChanges: [
        { type: "release", title: "v1.0.0", date: "2024-06-01" },
      ],
    })

    const plan = buildContentPlan(profile, defaultConfig)

    for (const item of plan.items) {
      if (item.type === "feature_highlight") expect(item.framework).toBe("PAS")
      if (item.type === "release_announcement") expect(item.framework).toBe("AIDA")
      if (item.type === "dev_tip") expect(item.framework).toBe("BAB")
    }
  })

  it("includes target platforms from config", () => {
    const profile = makeProfile()
    const plan = buildContentPlan(profile, defaultConfig)

    for (const item of plan.items) {
      expect(item.targetPlatforms).toEqual(["x", "linkedin"])
    }
  })

  it("triggers milestone_celebration for high stars", () => {
    const profile = makeProfile({
      stats: {
        stars: 200,
        forks: 10,
        watchers: 5,
        contributors: 2,
        age: "1 year",
        languages: {},
        topics: [],
      },
    })

    const plan = buildContentPlan(profile, defaultConfig)

    const types = plan.items.map((i) => i.type)
    expect(types).toContain("milestone_celebration")
  })

  it("filters items by allowed content types in config", () => {
    const profile = makeProfile({
      features: [{ claim: "Fast", source: "bench", confidence: "explicit" }],
      recentChanges: [{ type: "release", title: "v1.0.0", date: "2024-06-01" }],
    })

    const plan = buildContentPlan(profile, {
      ...defaultConfig,
      types: ["release_announcement"],
    })

    for (const item of plan.items) {
      expect(item.type).toBe("release_announcement")
    }
  })

  it("sorts by priority with releases first", () => {
    const profile = makeProfile({
      features: [{ claim: "Fast", source: "bench", confidence: "explicit" }],
      recentChanges: [
        { type: "release", title: "v1.0.0", date: "2024-06-01" },
        ...Array.from({ length: 25 }, (_, i) => ({
          type: "commit" as const,
          title: `feat: change ${i}`,
          date: "2024-06-01",
        })),
      ],
    })

    const plan = buildContentPlan(profile, defaultConfig)

    expect(plan.items[0].type).toBe("release_announcement")
  })
})
