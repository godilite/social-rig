import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../lib/api"
import type { ConnectorInfo } from "../lib/api"
import { useState } from "react"
import { Plug, Check, X, ExternalLink, Shield, AlertCircle } from "lucide-react"

const PLATFORM_ICONS: Record<string, string> = {
  x: "𝕏",
  linkedin: "in",
  devto: "D",
  hashnode: "#",
  bluesky: "🦋",
  mastodon: "🐘",
  reddit: "r/",
}

const PLATFORM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  x: { bg: "#f6f8fa", text: "#1f2328", border: "#d0d7de" },
  linkedin: { bg: "#ddf4ff", text: "#0969da", border: "#54aeff" },
  devto: { bg: "#f6f8fa", text: "#1f2328", border: "#d0d7de" },
  hashnode: { bg: "#ddf4ff", text: "#0969da", border: "#54aeff" },
  bluesky: { bg: "#ddf4ff", text: "#0969da", border: "#54aeff" },
  mastodon: { bg: "#fbefff", text: "#8250df", border: "#c297eb" },
  reddit: { bg: "#ffebe9", text: "#cf222e", border: "#ff8182" },
}

const AUTH_GUIDES: Record<string, { steps: string[]; docsUrl: string }> = {
  x: {
    steps: [
      "Create a Developer account at developer.twitter.com",
      "Create a new project and app",
      "Generate API keys and Bearer token",
      "Set callback URL to your domain",
    ],
    docsUrl: "https://developer.twitter.com/en/docs/authentication",
  },
  linkedin: {
    steps: [
      "Create a LinkedIn Developer app",
      "Request w_member_social permission",
      "Generate OAuth 2.0 credentials",
      "Configure redirect URLs",
    ],
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/shared/authentication/",
  },
  devto: {
    steps: [
      "Go to dev.to/settings/extensions",
      "Generate a new API key",
      "Copy the key to your connector settings",
    ],
    docsUrl: "https://developers.forem.com/api",
  },
  hashnode: {
    steps: [
      "Go to hashnode.com/settings/developer",
      "Generate a Personal Access Token",
      "Copy the token to your connector settings",
    ],
    docsUrl: "https://apidocs.hashnode.com/",
  },
}

const capLabels: Record<string, string> = {
  supportsThreads: "Threads",
  supportsArticle: "Articles",
  supportsScheduling: "Scheduling",
  supportsAnalytics: "Analytics",
  supportsMedia: "Media",
  supportsDraftUpdate: "Draft Update",
  supportsCarousel: "Carousel",
}

function ConnectorSetupPanel({
  connector,
  isEnabled,
  onToggle,
  onClose,
}: {
  connector: ConnectorInfo
  isEnabled: boolean
  onToggle: () => void
  onClose: () => void
}) {
  const guide = AUTH_GUIDES[connector.id]
  const colors = PLATFORM_COLORS[connector.id] ?? PLATFORM_COLORS.x

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-[#d0d7de] bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-md text-[16px] font-bold"
                style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
              >
                {PLATFORM_ICONS[connector.id] ?? connector.id[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-[#1f2328]">{connector.name}</h2>
                <p className="font-mono text-[11px] text-[#8b949e]">{connector.id}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-md p-1.5 text-[#656d76] hover:bg-[#f6f8fa]">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-4">
            <div>
              <p className="text-[13px] font-medium text-[#1f2328]">
                {isEnabled ? "Enabled" : "Disabled"}
              </p>
              <p className="text-[12px] text-[#656d76]">
                {isEnabled ? "Content will be generated for this platform" : "Enable to generate content for this platform"}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className={`relative h-6 w-11 rounded-full transition-colors ${isEnabled ? "bg-[#2da44e]" : "bg-[#d0d7de]"}`}
            >
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[#656d76]">Capabilities</h3>
            <div className="rounded-md border border-[#d0d7de]">
              {Object.entries(capLabels).map(([key, label], i) => {
                const supported = connector.capabilities[key as keyof typeof connector.capabilities] === true
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between px-4 py-2.5 text-[13px] ${i > 0 ? "border-t border-[#d8dee4]" : ""}`}
                  >
                    <span className="text-[#1f2328]">{label}</span>
                    {supported ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#1a7f37]">
                        <Check size={14} /> Supported
                      </span>
                    ) : (
                      <span className="text-[12px] text-[#8b949e]">Not available</span>
                    )}
                  </div>
                )
              })}
              <div className="flex items-center justify-between border-t border-[#d8dee4] px-4 py-2.5 text-[13px]">
                <span className="text-[#1f2328]">Max length</span>
                <span className="font-mono text-[12px] font-medium text-[#1f2328]">{connector.capabilities.maxLength.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[#656d76]">
              <Shield size={13} className="mr-1 inline" /> Authentication
            </h3>
            <div className="rounded-md border border-[#d0d7de] bg-[#fff8c5] p-4">
              <div className="flex gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-[#9a6700]" />
                <div>
                  <p className="text-[13px] font-medium text-[#9a6700]">Publishing coming soon</p>
                  <p className="mt-1 text-[12px] text-[#9a6700]/80">
                    Direct publishing to {connector.name} is in development. For now, use <code className="rounded bg-white/50 px-1 font-mono text-[11px]">social-rig export</code> to copy content.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {guide && (
            <div>
              <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[#656d76]">Setup Guide</h3>
              <div className="rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-4">
                <ol className="space-y-2.5">
                  {guide.steps.map((step, i) => (
                    <li key={i} className="flex gap-2.5 text-[13px] text-[#1f2328]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d0d7de] text-[11px] font-semibold text-[#656d76]">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
                <a
                  href={guide.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#0969da] hover:underline"
                >
                  <ExternalLink size={13} /> View API documentation
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Plugins() {
  const queryClient = useQueryClient()
  const { data: connectors, isLoading } = useQuery({ queryKey: ["connectors"], queryFn: api.connectors.list })
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: api.projects.list })

  const [setupConnector, setSetupConnector] = useState<ConnectorInfo | null>(null)

  const project = projects?.[0]
  const projectConfig = project?.config as Record<string, unknown> | null | undefined
  const connectorsConfig = (projectConfig?.connectors ?? { builtin: [], community: [] }) as { builtin: string[]; community: string[] }
  const enabledIds = new Set(connectorsConfig.builtin ?? [])

  const toggleMutation = useMutation({
    mutationFn: async (connectorId: string) => {
      if (!project) return
      const current = [...(connectorsConfig.builtin ?? [])]
      const updated = current.includes(connectorId)
        ? current.filter((id) => id !== connectorId)
        : [...current, connectorId]
      const newConfig = { ...projectConfig, connectors: { ...connectorsConfig, builtin: updated } }
      return api.projects.updateConfig(project.id, newConfig as Record<string, unknown>)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      queryClient.invalidateQueries({ queryKey: ["project"] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#d0d7de] border-t-[#0969da]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-4 py-3">
        <div className="flex items-center gap-2">
          <Plug size={16} className="text-[#656d76]" />
          <p className="text-[13px] text-[#656d76]">
            <span className="font-medium text-[#1f2328]">{enabledIds.size}</span> connector{enabledIds.size !== 1 ? "s" : ""} enabled · Click a connector to configure
          </p>
        </div>
      </div>

      {!connectors?.length ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[#d0d7de] py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-[#f6f8fa]">
            <Plug size={24} className="text-[#d0d7de]" />
          </div>
          <p className="mt-4 text-[13px] font-medium text-[#656d76]">No connectors available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {connectors.map((c: ConnectorInfo) => {
            const isEnabled = enabledIds.has(c.id)
            const colors = PLATFORM_COLORS[c.id] ?? PLATFORM_COLORS.x
            const capCount = Object.entries(capLabels).filter(([key]) => c.capabilities[key as keyof typeof c.capabilities] === true).length

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSetupConnector(c)}
                className={`rounded-md border p-5 text-left transition-all ${
                  isEnabled
                    ? "border-[#2da44e] bg-white hover:bg-[#f6f8fa]"
                    : "border-[#d0d7de] bg-white hover:bg-[#f6f8fa]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-md text-[15px] font-bold"
                      style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                    >
                      {PLATFORM_ICONS[c.id] ?? c.id[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-[#1f2328]">{c.name}</h3>
                      <p className="text-[11px] text-[#8b949e]">{c.capabilities.maxLength.toLocaleString()} chars max</p>
                    </div>
                  </div>
                  {isEnabled ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#dafbe1] px-2 py-0.5 text-[11px] font-medium text-[#1a7f37]">
                      <Check size={12} /> Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#f6f8fa] px-2 py-0.5 text-[11px] font-medium text-[#8b949e]">
                      Inactive
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {Object.entries(capLabels).map(([key, label]) => {
                    const supported = c.capabilities[key as keyof typeof c.capabilities] === true
                    if (!supported) return null
                    return (
                      <span key={key} className="rounded-full bg-[#f6f8fa] px-2 py-0.5 text-[11px] text-[#656d76]">
                        {label}
                      </span>
                    )
                  })}
                </div>

                <div className="mt-3 text-[11px] text-[#8b949e]">
                  {capCount} of {Object.keys(capLabels).length} capabilities
                </div>
              </button>
            )
          })}
        </div>
      )}

      {setupConnector && (
        <ConnectorSetupPanel
          connector={setupConnector}
          isEnabled={enabledIds.has(setupConnector.id)}
          onToggle={() => toggleMutation.mutate(setupConnector.id)}
          onClose={() => setSetupConnector(null)}
        />
      )}
    </div>
  )
}
