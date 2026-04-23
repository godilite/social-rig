import type { ContentType, CopyFramework, Platform } from "../types.js"

export interface FrameworkContext {
  projectName: string
  feature: string
  audience: string
  tone: string
  platform: Platform
}

export interface FrameworkPrompt {
  systemInstructions: string
  structure: string[]
  example?: string
}

const FRAMEWORK_MAP: Record<CopyFramework, (ctx: FrameworkContext) => FrameworkPrompt> = {
  PAS: (ctx) => ({
    systemInstructions: [
      `You are writing marketing copy for "${ctx.projectName}" using the Problem-Agitate-Solution framework.`,
      `Target audience: ${ctx.audience}. Tone: ${ctx.tone}. Platform: ${ctx.platform}.`,
      "Structure the content in three clear phases:",
      "1. PROBLEM: Identify a specific pain point the audience faces.",
      "2. AGITATE: Amplify the frustration by describing consequences of not solving it.",
      "3. SOLUTION: Present the feature/product as the natural resolution.",
      "Keep language authentic. Never use corporate buzzwords or hyperbole.",
    ].join("\n"),
    structure: [
      "Open with a relatable problem statement",
      "Expand on why this problem is painful or costly",
      `Position ${ctx.projectName}'s "${ctx.feature}" as the solution`,
    ],
    example: `Tired of manually tagging releases? One missed tag and your changelog is wrong, your users are confused, and your credibility takes a hit. ${ctx.projectName} auto-detects version bumps from your commits and generates accurate release notes instantly.`,
  }),

  AIDA: (ctx) => ({
    systemInstructions: [
      `You are writing marketing copy for "${ctx.projectName}" using the AIDA framework.`,
      `Target audience: ${ctx.audience}. Tone: ${ctx.tone}. Platform: ${ctx.platform}.`,
      "Structure the content in four phases:",
      "1. ATTENTION: Open with a bold hook or surprising fact.",
      "2. INTEREST: Build curiosity with specifics about how it works.",
      "3. DESIRE: Show the outcome or transformation the reader gets.",
      "4. ACTION: End with a clear, low-friction call to action.",
      "Be specific, not generic. Use concrete numbers or outcomes when possible.",
    ].join("\n"),
    structure: [
      "Hook with a surprising stat, question, or bold claim",
      "Explain how the feature works in concrete terms",
      "Paint the after-picture for the reader",
      "Include a clear next step (try it, star it, read more)",
    ],
    example: `What if your CI pipeline could self-heal? ${ctx.projectName} watches your test output, detects flaky patterns, and quarantines unreliable tests automatically. Ship with confidence without babysitting your pipeline. Try it: github.com/...`,
  }),

  BAB: (ctx) => ({
    systemInstructions: [
      `You are writing marketing copy for "${ctx.projectName}" using the Before-After-Bridge framework.`,
      `Target audience: ${ctx.audience}. Tone: ${ctx.tone}. Platform: ${ctx.platform}.`,
      "Structure the content in three phases:",
      "1. BEFORE: Describe the current painful state without the product.",
      "2. AFTER: Describe the improved state with the product.",
      "3. BRIDGE: Explain how the product gets you from before to after.",
      "Focus on transformation. Make the contrast vivid and specific.",
    ].join("\n"),
    structure: [
      "Describe the frustrating status quo",
      "Paint the ideal outcome after adopting the solution",
      `Show how ${ctx.projectName}'s "${ctx.feature}" bridges the gap`,
    ],
    example: `BEFORE: You spend hours manually writing API docs that go stale the moment code changes. AFTER: Your docs update themselves on every push, always accurate, always current. BRIDGE: ${ctx.projectName} parses your route handlers and generates OpenAPI specs automatically.`,
  }),
}

const ALL_FRAMEWORKS: CopyFramework[] = ["PAS", "AIDA", "BAB"]

const CONTENT_TYPE_PREFERRED: Record<ContentType, CopyFramework[]> = {
  feature_highlight: ["PAS", "AIDA", "BAB"],
  release_announcement: ["AIDA", "BAB", "PAS"],
  dev_tip: ["BAB", "PAS", "AIDA"],
  behind_the_scenes: ["BAB", "AIDA", "PAS"],
  tutorial_teaser: ["AIDA", "PAS", "BAB"],
  milestone_celebration: ["AIDA", "BAB", "PAS"],
}

let frameworkCounter = 0

export function selectFramework(contentType: ContentType): CopyFramework {
  const preferred = CONTENT_TYPE_PREFERRED[contentType] ?? ALL_FRAMEWORKS
  const index = frameworkCounter % preferred.length
  frameworkCounter++
  return preferred[index]
}

export function resetFrameworkCounter(): void {
  frameworkCounter = 0
}

export function applyFramework(framework: CopyFramework, context: FrameworkContext): FrameworkPrompt {
  return FRAMEWORK_MAP[framework](context)
}
