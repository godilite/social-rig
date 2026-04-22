export type ContentType =
  | "feature_highlight"
  | "release_announcement"
  | "dev_tip"
  | "behind_the_scenes"
  | "tutorial_teaser"
  | "milestone_celebration"

export type CopyFramework = "PAS" | "AIDA" | "BAB"

export type Platform = "x" | "linkedin" | "devto" | "hashnode" | "bluesky" | "mastodon" | "reddit"

export type DraftStatus = "pending" | "approved" | "rejected" | "published"

export type CalendarStatus = "scheduled" | "published" | "missed" | "cancelled"

export type Confidence = "explicit" | "inferred"

export interface GroundedFact {
  claim: string
  source: string
  confidence: Confidence
}

export interface RepoChange {
  type: "commit" | "release" | "pr"
  title: string
  date: string
  url?: string
  details?: string
}

export interface RepoStats {
  stars?: number
  forks?: number
  watchers?: number
  contributors: number
  age: string
  languages: Record<string, number>
  topics: string[]
}

export interface ProjectProfile {
  name: string
  description: string
  languages: string[]
  frameworks: string[]
  recentChanges: RepoChange[]
  features: GroundedFact[]
  stats: RepoStats
  techStack: string[]
}

export interface PlannedContent {
  type: ContentType
  framework: CopyFramework
  angle: string
  targetPlatforms: Platform[]
  sourceFacts: GroundedFact[]
}

export interface ContentPlan {
  items: PlannedContent[]
}

export interface PlatformVariant {
  platform: Platform
  headline?: string
  body: string
  hashtags: string[]
  cta?: string
  charCount: number
}

export interface Draft {
  id: string
  projectId: string
  contentType: ContentType
  framework: CopyFramework
  status: DraftStatus
  content: PlatformVariant[]
  sourceFacts: GroundedFact[]
  imagePath?: string
  createdAt: string
  updatedAt: string
  reviewedAt?: string
  scheduledAt?: string
}

export interface CalendarEntry {
  id: string
  draftId: string
  projectId: string
  platform: Platform
  scheduledAt: string
  status: CalendarStatus
  createdAt: string
}

export interface VoiceConfig {
  tone: string
  audience: string
  avoid: string[]
}

export interface ImageConfig {
  enabled: boolean
  provider: string
  style: string
  brandColors: {
    primary: string
    background: string
  }
}

export interface ProjectConfig {
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

export interface DetectedProvider {
  name: string
  source: string
  type: "cli" | "server" | "cloud" | "parasited"
  model?: string
  apiKey?: string
  isLocal: boolean
  models?: string[]
}

export interface CapabilityFlags {
  supportsThreads: boolean
  supportsArticle: boolean
  supportsScheduling: boolean
  supportsAnalytics: boolean
  supportsMedia: boolean
  supportsDraftUpdate: boolean
  supportsCarousel: boolean
  maxLength: number
}

export interface ConnectorPlugin {
  id: string
  name: string
  capabilities: CapabilityFlags
  auth(config: Record<string, unknown>): Promise<{ success: boolean; credentials?: Record<string, unknown> }>
  validate(credentials: Record<string, unknown>): Promise<boolean>
  publish(draft: PlatformVariant, credentials: Record<string, unknown>): Promise<{ postId: string; url: string }>
  status?(postId: string): Promise<{ status: string; url?: string }>
  analytics?(postId: string): Promise<Record<string, number>>
}

export interface WorkspaceProject {
  name: string
  repo: string
  configPath: string
}

export interface Workspace {
  projects: WorkspaceProject[]
  defaultProject?: string
}
