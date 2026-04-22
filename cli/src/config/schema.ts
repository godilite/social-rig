import type { ContentType, CopyFramework, Platform, VoiceConfig, ImageConfig } from "../types.js"

export interface ConfigSchema {
  project: {
    name: string
    repo: string
    description?: string
  }
  voice: VoiceConfig
  ai: {
    provider: string
    model: string
    apiKeySource: string
  }
  images: ImageConfig
  content: {
    types: ContentType[]
    batchSize: number
    platforms: Platform[]
    blogTarget?: string
  }
  connectors: {
    builtin: string[]
    community: string[]
  }
}

export const TONE_OPTIONS = [
  "witty-technical",
  "professional",
  "casual",
  "founder",
] as const

export const PLATFORM_CHAR_LIMITS: Record<Platform, number> = {
  x: 280,
  linkedin: 3000,
  devto: 100000,
  hashnode: 100000,
  bluesky: 300,
  mastodon: 500,
  reddit: 40000,
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  feature_highlight: "Feature Highlight",
  release_announcement: "Release Announcement",
  dev_tip: "Dev Tip",
  behind_the_scenes: "Behind the Scenes",
  tutorial_teaser: "Tutorial Teaser",
  milestone_celebration: "Milestone Celebration",
}

export const FRAMEWORK_LABELS: Record<CopyFramework, string> = {
  PAS: "Problem-Agitate-Solution",
  AIDA: "Attention-Interest-Desire-Action",
  BAB: "Before-After-Bridge",
}
