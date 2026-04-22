import { nanoid } from "nanoid"
import type {
  ContentPlan,
  Draft,
  PlatformVariant,
  ProjectProfile,
  VoiceConfig,
  Platform,
} from "../types.js"
import type { AIProvider } from "../ai/provider.js"
import { applyFramework } from "./frameworks.js"
import { validateGrounding, enforceBannedPhrases } from "./grounding.js"
import { PLATFORM_CHAR_LIMITS, CONTENT_TYPE_LABELS } from "../config/schema.js"

const DEFAULT_BANNED = [
  "excited to announce",
  "game-changer",
  "revolutionary",
  "leveraging AI",
  "delighted to share",
  "thrilled to",
  "blown away",
  "next-gen",
  "world-class",
  "cutting-edge",
  "synergy",
  "disruptive",
]

function buildSystemPrompt(voice: VoiceConfig, platform: Platform, charLimit: number): string {
  return [
    `You are a developer marketing copywriter. Write for the "${platform}" platform.`,
    `Tone: ${voice.tone}. Audience: ${voice.audience}.`,
    `Hard character limit: ${charLimit} characters (including spaces). Do not exceed this.`,
    voice.avoid.length > 0
      ? `Never use these phrases: ${voice.avoid.join(", ")}.`
      : "",
    "Write in plain, authentic language. Be specific and concrete.",
    "Do not include hashtags in the body text. They will be added separately.",
    "Do not wrap your response in quotes or add meta-commentary.",
    "Return ONLY the post body text.",
  ]
    .filter(Boolean)
    .join("\n")
}

function buildUserPrompt(
  contentLabel: string,
  angle: string,
  structureInstructions: string,
  facts: string,
): string {
  return [
    `Content type: ${contentLabel}`,
    `Angle: ${angle}`,
    "",
    "Structure your post following these guidelines:",
    structureInstructions,
    "",
    "Ground your claims in these verified facts:",
    facts,
    "",
    "Write the post now.",
  ].join("\n")
}

function suggestHashtags(profile: ProjectProfile, platform: Platform): string[] {
  const tags: string[] = []
  const name = profile.name.replace(/[^a-zA-Z0-9]/g, "")
  if (name) tags.push(name)

  for (const lang of profile.languages.slice(0, 2)) {
    tags.push(lang.replace(/[^a-zA-Z0-9]/g, ""))
  }

  if (platform === "x" || platform === "bluesky" || platform === "mastodon") {
    tags.push("opensource", "devtools")
  }
  if (platform === "linkedin") {
    tags.push("SoftwareEngineering", "OpenSource")
  }

  return [...new Set(tags)].slice(0, 5)
}

async function generateVariant(
  provider: AIProvider,
  contentLabel: string,
  angle: string,
  frameworkStructure: string[],
  frameworkSystemInstructions: string,
  facts: string,
  voice: VoiceConfig,
  platform: Platform,
  profile: ProjectProfile,
): Promise<PlatformVariant> {
  const charLimit = PLATFORM_CHAR_LIMITS[platform]

  const systemPrompt = [
    frameworkSystemInstructions,
    "",
    buildSystemPrompt(voice, platform, charLimit),
  ].join("\n")

  const structureText = frameworkStructure.map((s, i) => `${i + 1}. ${s}`).join("\n")

  const userPrompt = buildUserPrompt(contentLabel, angle, structureText, facts)

  let body = await provider.generate(userPrompt, systemPrompt)

  const bannedList = [...DEFAULT_BANNED, ...voice.avoid]
  const { clean, removed: _removed } = enforceBannedPhrases(body, bannedList)
  body = clean

  if (body.length > charLimit) {
    body = body.slice(0, charLimit - 3) + "..."
  }

  const needsHeadline = platform === "linkedin" || platform === "devto" || platform === "hashnode" || platform === "reddit"
  const hashtags = suggestHashtags(profile, platform)

  return {
    platform,
    headline: needsHeadline ? angle : undefined,
    body,
    hashtags,
    cta: undefined,
    charCount: body.length,
  }
}

export async function generateDrafts(
  plan: ContentPlan,
  profile: ProjectProfile,
  provider: AIProvider,
  voiceConfig: VoiceConfig,
): Promise<Draft[]> {
  const drafts: Draft[] = []
  const now = new Date().toISOString()

  for (const item of plan.items) {
    const draftId = nanoid()
    const contentLabel = CONTENT_TYPE_LABELS[item.type]

    const frameworkPrompt = applyFramework(item.framework, {
      projectName: profile.name,
      feature: item.angle,
      audience: voiceConfig.audience,
      tone: voiceConfig.tone,
      platform: item.targetPlatforms[0] ?? "x",
    })

    const factsText = item.sourceFacts
      .map((f) => `- ${f.claim} (source: ${f.source}, confidence: ${f.confidence})`)
      .join("\n")

    const variants: PlatformVariant[] = []

    for (const platform of item.targetPlatforms) {
      const variant = await generateVariant(
        provider,
        contentLabel,
        item.angle,
        frameworkPrompt.structure,
        frameworkPrompt.systemInstructions,
        factsText,
        voiceConfig,
        platform,
        profile,
      )
      variants.push(variant)
    }

    const groundingResults = variants.map((v) =>
      validateGrounding(v.body, item.sourceFacts),
    )

    const _hasUngrounded = groundingResults.some((r) => !r.valid)

    drafts.push({
      id: draftId,
      projectId: profile.name,
      contentType: item.type,
      framework: item.framework,
      status: "pending",
      content: variants,
      sourceFacts: item.sourceFacts,
      createdAt: now,
      updatedAt: now,
    })
  }

  return drafts
}
