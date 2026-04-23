import type { ContentType, Platform } from "../types.js"

export interface HookFormula {
  category: string
  hooks: string[]
}

export interface PlatformRule {
  platform: Platform
  rules: string[]
}

export const HOOK_FORMULAS: Record<string, HookFormula> = {
  curiosity: {
    category: "Curiosity",
    hooks: [
      "I was wrong about [common belief].",
      "The real reason [outcome] happens isn't what you think.",
      "[Impressive result] and it only took [surprisingly short time].",
    ],
  },
  story: {
    category: "Story",
    hooks: [
      "Last week, [unexpected thing] happened.",
      "I almost [big mistake/failure].",
      "3 years ago, I [past state]. Today, [current state].",
    ],
  },
  value: {
    category: "Value",
    hooks: [
      "How to [desirable outcome] (without [common pain]):",
      "[Number] [things] that [outcome]:",
      "Stop [common mistake]. Do this instead:",
    ],
  },
  contrarian: {
    category: "Contrarian",
    hooks: [
      "Unpopular opinion: [bold statement]",
      "[Common advice] is wrong. Here's why:",
      "I stopped [common practice] and [positive result].",
    ],
  },
}

export const PLATFORM_RULES: Record<Platform, PlatformRule> = {
  x: {
    platform: "x",
    rules: [
      "Max 280 characters. Every word must earn its place.",
      "Lead with the hook. No preamble.",
      "Use line breaks for readability.",
      "One idea per tweet. Thread for complexity.",
      "Hot takes and contrarian views drive engagement.",
    ],
  },
  linkedin: {
    platform: "linkedin",
    rules: [
      "First line is everything. It appears before 'see more'.",
      "Use short paragraphs (1-2 sentences each).",
      "Storytelling outperforms advice posts.",
      "Professional but human tone. Not corporate.",
      "Carousel format for frameworks and lists.",
    ],
  },
  devto: {
    platform: "devto",
    rules: [
      "Long-form article format. Detailed and educational.",
      "Code examples increase engagement significantly.",
      "Clear structure with headers and sections.",
      "Practical takeaways over theory.",
    ],
  },
  hashnode: {
    platform: "hashnode",
    rules: [
      "Technical audience expects depth.",
      "Include working code snippets.",
      "SEO-friendly title and structure.",
    ],
  },
  bluesky: {
    platform: "bluesky",
    rules: [
      "Max 300 characters. Similar to X constraints.",
      "Conversational, community-oriented tone.",
      "Hook-first writing. No filler.",
    ],
  },
  mastodon: {
    platform: "mastodon",
    rules: [
      "Max 500 characters. Slightly more room than X.",
      "Community values authenticity over promotion.",
      "Avoid overly salesy language.",
    ],
  },
  reddit: {
    platform: "reddit",
    rules: [
      "Value-first. Reddit hates overt promotion.",
      "Write like you are sharing with peers, not marketing.",
      "Explain what the tool does and why you built it.",
      "Be transparent about being the creator.",
    ],
  },
}

export const CONTENT_PILLAR_BALANCE: Record<string, number> = {
  "Industry insights": 30,
  "Behind-the-scenes": 25,
  "Educational": 25,
  "Personal": 15,
  "Promotional": 5,
}

export const ENGAGEMENT_RULES = [
  "The first line determines if anyone reads the rest.",
  "Posts with a hook get 3-5x more engagement than those without.",
  "Questions drive comments. Statements drive likes.",
  "Specific numbers outperform vague claims.",
  "Share failures and lessons, not just wins.",
]

const HOOK_MAP: Record<ContentType, string[]> = {
  feature_highlight: ["value", "curiosity"],
  release_announcement: ["curiosity", "value"],
  dev_tip: ["value", "contrarian"],
  behind_the_scenes: ["story", "curiosity"],
  tutorial_teaser: ["value", "curiosity"],
  milestone_celebration: ["story", "value"],
}

export function getHooksForContent(contentType: ContentType): string[] {
  const categories = HOOK_MAP[contentType] ?? ["value"]
  const hooks: string[] = []
  for (const cat of categories) {
    const formula = HOOK_FORMULAS[cat]
    if (formula) hooks.push(...formula.hooks)
  }
  return hooks
}

export function getPlatformRules(platform: Platform): string[] {
  return PLATFORM_RULES[platform]?.rules ?? []
}
