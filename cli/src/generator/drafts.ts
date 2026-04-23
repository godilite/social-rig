import { nanoid } from "nanoid"
import type {
  ContentPlan,
  Draft,
  PlatformVariant,
  ProjectProfile,
  VoiceConfig,
  ImageConfig,
  Platform,
} from "../types.js"
import type { AIProvider } from "../ai/provider.js"
import { applyFramework } from "./frameworks.js"
import { validateGrounding, enforceBannedPhrases } from "./grounding.js"
import { PLATFORM_CHAR_LIMITS, CONTENT_TYPE_LABELS } from "../config/schema.js"
import { buildSkillContext } from "../skills/index.js"
import { createImageGenerator, buildImagePrompt, saveGeneratedImage } from "./images.js"

const PREAMBLE_PATTERNS = [
  /^(?:here(?:'s| is)(?: the| a| my| your)?[\s\w]*(?:post|draft|content|copy|tweet|version|text)[:\s]*\n*)/i,
  /^(?:sure[!,.]?\s*(?:here(?:'s| is))?[\s\w]*[:\s]*\n*)/i,
  /^(?:absolutely[!,.]?\s*(?:here(?:'s| is))?[\s\w]*[:\s]*\n*)/i,
  /^(?:of course[!,.]?\s*[\s\w]*[:\s]*\n*)/i,
]

function stripAiArtifacts(text: string): string {
  let result = text.trim()

  result = result.replace(/^["'`]+|["'`]+$/g, "")
  result = result.replace(/^```[\w]*\n?|\n?```$/g, "")

  for (const pattern of PREAMBLE_PATTERNS) {
    result = result.replace(pattern, "")
  }

  result = result.replace(/\u2014/g, ". ")
  result = result.replace(/\u2013/g, ", ")
  result = result.replace(/ -- /g, ". ")
  result = result.replace(/---+/g, "")

  result = result.replace(/\n{3,}/g, "\n\n")

  return result.trim()
}

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
    "CRITICAL OUTPUT RULES:",
    "- Return ONLY the post body text. Nothing else.",
    "- Do NOT include any preamble like 'Here is the post:' or 'Here is a draft:'.",
    "- Do NOT wrap your response in quotes, backticks, or markdown formatting.",
    "- Do NOT use --- or -- as separators or horizontal rules.",
    "- Do NOT use em-dashes. Use periods or commas instead.",
    "- Do NOT add meta-commentary about the post.",
    "- Do NOT describe what you are about to write. Just write it.",
    "- The output must read as a real social media post, ready to publish as-is.",
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
  contentType: ContentType,
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
  const skillContext = buildSkillContext(contentType, platform)

  const systemPrompt = [
    frameworkSystemInstructions,
    "",
    buildSystemPrompt(voice, platform, charLimit),
    "",
    "--- Marketing Skills Context ---",
    "Apply these principles naturally. Do not reference them explicitly in the output.",
    "",
    skillContext,
  ].join("\n")

  const structureText = frameworkStructure.map((s, i) => `${i + 1}. ${s}`).join("\n")

  const userPrompt = buildUserPrompt(contentLabel, angle, structureText, facts)

  let body = await provider.generate(userPrompt, systemPrompt)

  body = stripAiArtifacts(body)

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
  imageConfig?: ImageConfig,
): Promise<{ drafts: Draft[]; imageWarning?: string }> {
  const drafts: Draft[] = []
  const now = new Date().toISOString()

  let imageGenerator: ReturnType<typeof createImageGenerator>["generator"] = null
  let imageWarning: string | undefined

  if (imageConfig) {
    const result = createImageGenerator(imageConfig)
    imageGenerator = result.generator
    imageWarning = result.warning
  }

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
        item.type,
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

    let imagePath: string | undefined
    if (imageGenerator && imageConfig) {
      try {
        const prompt = buildImagePrompt(item.type, item.angle, profile, imageConfig)
        const image = await imageGenerator.generate(prompt)
        imagePath = await saveGeneratedImage(draftId, image)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        imageWarning = imageWarning
          ? `${imageWarning}\nImage generation failed for draft ${draftId}: ${msg}`
          : `Image generation failed for draft ${draftId}: ${msg}`
      }
    }

    drafts.push({
      id: draftId,
      projectId: profile.name,
      contentType: item.type,
      framework: item.framework,
      status: "pending",
      content: variants,
      sourceFacts: item.sourceFacts,
      imagePath,
      createdAt: now,
      updatedAt: now,
    })
  }

  return { drafts, imageWarning }
}
