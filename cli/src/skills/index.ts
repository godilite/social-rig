import type { ContentType, Platform } from "../types.js"
import { getHooksForContent, getPlatformRules, ENGAGEMENT_RULES } from "./social-content.js"
import { getCopywritingSlice } from "./copywriting.js"
import { getPsychPrinciples } from "./psychology.js"

const SHORT_FORM_PLATFORMS = new Set<Platform>(["x", "bluesky", "mastodon"])

export function buildSkillContext(contentType: ContentType, platform: Platform): string {
  const isShortForm = SHORT_FORM_PLATFORMS.has(platform)
  const sections: string[] = []

  const platformRules = getPlatformRules(platform)
  if (platformRules.length > 0) {
    sections.push(
      `[Platform: ${platform}]`,
      ...platformRules.map((r) => `- ${r}`),
    )
  }

  const hooks = getHooksForContent(contentType)
  if (hooks.length > 0) {
    const selected = isShortForm ? hooks.slice(0, 3) : hooks.slice(0, 5)
    sections.push(
      "",
      "[Hook formulas to model your opening after]",
      ...selected.map((h) => `- ${h}`),
    )
  }

  const copy = getCopywritingSlice(isShortForm)
  sections.push(
    "",
    "[Copywriting rules]",
    ...copy.principles.map((p) => `- ${p}`),
  )

  if (!isShortForm && copy.headlines.length > 0) {
    sections.push(
      "",
      "[Headline formulas]",
      ...copy.headlines.slice(0, 4).map((h) => `- ${h}`),
    )
  }

  if (copy.style.length > 0) {
    sections.push(
      "",
      "[Style]",
      ...copy.style.map((s) => `- ${s}`),
    )
  }

  const psych = getPsychPrinciples(contentType)
  if (psych.length > 0) {
    const selected = isShortForm ? psych.slice(0, 2) : psych.slice(0, 3)
    sections.push(
      "",
      "[Psychology principles to weave in naturally]",
      ...selected.map((p) => `- ${p.name}: ${p.application}`),
    )
  }

  const engagementSlice = isShortForm
    ? ENGAGEMENT_RULES.slice(0, 2)
    : ENGAGEMENT_RULES.slice(0, 3)
  sections.push(
    "",
    "[Engagement]",
    ...engagementSlice.map((r) => `- ${r}`),
  )

  return sections.join("\n")
}
