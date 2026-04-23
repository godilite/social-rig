const BASE = import.meta.env.DEV ? "http://localhost:4040" : ""

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export interface DraftRow {
  id: string
  project_id: string
  content_type: string
  framework: string
  status: string
  source_facts_json: string | null
  image_path: string | null
  created_at: string
  updated_at: string
  reviewed_at: string | null
  scheduled_at: string | null
}

export interface DraftVariant {
  id: string
  draft_id: string
  platform: string
  headline: string | null
  body: string
  hashtags_json: string
  cta: string | null
  char_count: number | null
}

export interface DraftWithVariants extends DraftRow {
  variants: DraftVariant[]
}

export interface DraftCounts {
  pending: number
  approved: number
  rejected: number
  published: number
}

export interface ProjectRow {
  id: string
  name: string
  repo: string
  description: string | null
  config_path: string | null
  profile_json: string | null
  created_at: string
  updated_at: string
  config?: Record<string, unknown> | null
}

export interface CalendarEntry {
  id: string
  draft_id: string
  project_id: string
  platform: string
  scheduled_at: string
  status: string
  created_at: string
}

export interface ActivityRow {
  id: number
  project_id: string | null
  action: string
  details_json: string
  created_at: string
}

export interface ConnectorInfo {
  id: string
  name: string
  capabilities: {
    supportsThreads: boolean
    supportsArticle: boolean
    supportsScheduling: boolean
    supportsAnalytics: boolean
    supportsMedia: boolean
    supportsDraftUpdate: boolean
    supportsCarousel: boolean
    maxLength: number
  }
}

export interface ProviderInfo {
  name: string
  source: string
  type: "cli" | "server" | "cloud" | "parasited"
  model: string | null
  isLocal: boolean
  models: string[]
}

export interface StatsResponse {
  drafts: DraftCounts
  projects: number
  connectors: number
}

export const api = {
  drafts: {
    list: (params?: Record<string, string>) => {
      const q = params ? "?" + new URLSearchParams(params).toString() : ""
      return request<DraftRow[]>(`/api/drafts${q}`)
    },
    get: (id: string) => request<DraftWithVariants>(`/api/drafts/${id}`),
    updateStatus: (id: string, status: string) =>
      request<DraftWithVariants>(`/api/drafts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, reviewedAt: new Date().toISOString() }),
      }),
    updateVariant: (draftId: string, vid: string, data: Record<string, unknown>) =>
      request(`/api/drafts/${draftId}/variants/${vid}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request(`/api/drafts/${id}`, { method: "DELETE" }),
    counts: (projectId?: string) => {
      const q = projectId ? `?projectId=${projectId}` : ""
      return request<DraftCounts>(`/api/drafts/counts${q}`)
    },
  },
  projects: {
    list: () => request<ProjectRow[]>("/api/projects"),
    get: (id: string) => request<ProjectRow>(`/api/projects/${id}`),
    updateConfig: (id: string, config: Record<string, unknown>) =>
      request(`/api/projects/${id}/config`, {
        method: "PUT",
        body: JSON.stringify(config),
      }),
  },
  calendar: {
    list: (params?: Record<string, string>) => {
      const q = params ? "?" + new URLSearchParams(params).toString() : ""
      return request<CalendarEntry[]>(`/api/calendar${q}`)
    },
    create: (data: { draftId: string; projectId: string; platform: string; scheduledAt: string }) =>
      request("/api/calendar", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request(`/api/calendar/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/calendar/${id}`, { method: "DELETE" }),
  },
  stats: () => request<StatsResponse>("/api/stats"),
  activity: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<ActivityRow[]>(`/api/activity${q}`)
  },
  connectors: {
    list: () => request<ConnectorInfo[]>("/api/connectors"),
    capabilities: (id: string) => request(`/api/connectors/${id}/capabilities`),
  },
  providers: {
    list: () => request<ProviderInfo[]>("/api/providers"),
  },
  plugins: {
    list: () => request<ConnectorInfo[]>("/api/plugins"),
  },
  images: {
    upload: async (draftId: string, file: File) => {
      const formData = new FormData()
      formData.append("image", file)
      const res = await fetch(`${BASE}/api/images/upload/${draftId}`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      return res.json() as Promise<{ imagePath: string; filename: string }>
    },
    addUrl: (draftId: string, url: string) =>
      request<{ imagePath: string; filename: string }>(`/api/images/upload/${draftId}`, {
        method: "POST",
        body: JSON.stringify({ url }),
      }),
    remove: (draftId: string) =>
      request(`/api/images/${draftId}`, { method: "DELETE" }),
    url: (filename: string) => `${BASE}/api/images/${filename}`,
  },
}
