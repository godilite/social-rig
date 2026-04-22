import type { ContentType, ContentPlan, Platform, PlannedContent, ProjectProfile, GroundedFact } from "../types.js"
import { selectFramework } from "./frameworks.js"

interface StrategyConfig {
  types: ContentType[]
  platforms: Platform[]
  batchSize: number
}

interface ContentSignal {
  type: ContentType
  angle: string
  facts: GroundedFact[]
  priority: number
}

function detectSignals(profile: ProjectProfile): ContentSignal[] {
  const signals: ContentSignal[] = []

  const releaseTags = profile.recentChanges.filter((c) => c.type === "release")
  if (releaseTags.length > 0) {
    const latest = releaseTags[0]
    signals.push({
      type: "release_announcement",
      angle: `New release: ${latest.title}`,
      facts: [
        { claim: `Released ${latest.title}`, source: latest.url ?? "git tags", confidence: "explicit" },
      ],
      priority: 10,
    })
  }

  for (const feature of profile.features.slice(0, 3)) {
    signals.push({
      type: "feature_highlight",
      angle: feature.claim,
      facts: [feature],
      priority: 8,
    })
  }

  const recentCommits = profile.recentChanges.filter((c) => c.type === "commit")
  if (recentCommits.length > 20) {
    signals.push({
      type: "behind_the_scenes",
      angle: `${recentCommits.length} commits in the last 30 days: what the team has been building`,
      facts: [
        {
          claim: `${recentCommits.length} commits in the last 30 days`,
          source: "git log",
          confidence: "explicit",
        },
      ],
      priority: 5,
    })
  }

  const hasMultipleSections = profile.features.length >= 3
  if (hasMultipleSections) {
    const topFeature = profile.features[0]
    signals.push({
      type: "tutorial_teaser",
      angle: `How to get started with ${topFeature?.claim ?? profile.name}`,
      facts: topFeature ? [topFeature] : [],
      priority: 4,
    })
  }

  const stars = profile.stats.stars ?? 0
  const contributors = profile.stats.contributors
  if (stars > 100 || contributors > 5) {
    const milestones: string[] = []
    const facts: GroundedFact[] = []

    if (stars > 100) {
      milestones.push(`${stars} stars`)
      facts.push({ claim: `${stars} GitHub stars`, source: "GitHub API", confidence: "explicit" })
    }
    if (contributors > 5) {
      milestones.push(`${contributors} contributors`)
      facts.push({
        claim: `${contributors} contributors`,
        source: "GitHub API",
        confidence: "explicit",
      })
    }

    signals.push({
      type: "milestone_celebration",
      angle: `Milestone reached: ${milestones.join(" and ")}`,
      facts,
      priority: 7,
    })
  }

  return signals
}

function ensureDevTip(
  signals: ContentSignal[],
  profile: ProjectProfile,
): ContentSignal[] {
  const hasDevTip = signals.some((s) => s.type === "dev_tip")
  if (hasDevTip) return signals

  const techStack = profile.techStack.length > 0
    ? profile.techStack.slice(0, 3).join(", ")
    : profile.languages.slice(0, 2).join(", ")

  const tipFact: GroundedFact = profile.features[0]
    ?? { claim: `Built with ${techStack}`, source: "repo analysis", confidence: "inferred" }

  return [
    ...signals,
    {
      type: "dev_tip",
      angle: `Quick tip: using ${profile.name} with ${techStack}`,
      facts: [tipFact],
      priority: 3,
    },
  ]
}

export function buildContentPlan(
  profile: ProjectProfile,
  config: StrategyConfig,
): ContentPlan {
  const allSignals = ensureDevTip(detectSignals(profile), profile)

  const filtered = allSignals.filter((s) => config.types.includes(s.type))

  const sorted = [...filtered].sort((a, b) => b.priority - a.priority)

  const selected = sorted.slice(0, config.batchSize)

  const items: PlannedContent[] = selected.map((signal) => ({
    type: signal.type,
    framework: selectFramework(signal.type),
    angle: signal.angle,
    targetPlatforms: config.platforms,
    sourceFacts: signal.facts,
  }))

  return { items }
}
