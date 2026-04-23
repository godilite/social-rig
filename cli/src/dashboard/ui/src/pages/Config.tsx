import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../lib/api"
import type { ProjectRow, ProviderInfo } from "../lib/api"
import { useState, useEffect } from "react"
import { Save, RotateCcw, ChevronDown, Plus, X, Cpu, Globe, Terminal, Zap } from "lucide-react"

const TONE_OPTIONS = ["witty-technical", "professional", "casual", "founder"]
const PLATFORM_OPTIONS = [
  { id: "x", label: "X (Twitter)" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "devto", label: "Dev.to" },
  { id: "hashnode", label: "Hashnode" },
  { id: "bluesky", label: "Bluesky" },
  { id: "mastodon", label: "Mastodon" },
  { id: "reddit", label: "Reddit" },
]
const CONTENT_TYPE_OPTIONS = [
  { id: "feature_highlight", label: "Feature Highlight" },
  { id: "release_announcement", label: "Release Announcement" },
  { id: "dev_tip", label: "Dev Tip" },
  { id: "behind_the_scenes", label: "Behind the Scenes" },
  { id: "tutorial_teaser", label: "Tutorial Teaser" },
  { id: "milestone_celebration", label: "Milestone Celebration" },
]
const IMAGE_STYLE_OPTIONS = ["minimal-tech", "gradient", "screenshot", "abstract"]

const providerTypeIcons: Record<string, typeof Cpu> = {
  cli: Terminal,
  server: Cpu,
  cloud: Globe,
  parasited: Zap,
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5 border-b border-[#d0d7de] pb-4">
      <h3 className="text-[14px] font-semibold text-[#1f2328]">{title}</h3>
      <p className="mt-0.5 text-[12px] text-[#656d76]">{description}</p>
    </div>
  )
}

function FieldLabel({ label, htmlFor }: { label: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-[13px] font-medium text-[#1f2328]">
      {label}
    </label>
  )
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1.5 w-full rounded-md border border-[#d0d7de] bg-white px-3 py-[7px] text-[13px] text-[#1f2328] outline-none placeholder:text-[#8b949e] focus:border-[#0969da] focus:ring-2 focus:ring-[#ddf4ff]"
    />
  )
}

function SelectInput({
  id,
  value,
  onChange,
  options,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative mt-1.5">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-[#d0d7de] bg-white px-3 py-[7px] pr-8 text-[13px] text-[#1f2328] outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#ddf4ff]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#656d76]" />
    </div>
  )
}

function TogglePill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
        active
          ? "border-[#0969da] bg-[#ddf4ff] text-[#0969da]"
          : "border-[#d0d7de] bg-white text-[#656d76] hover:border-[#8b949e]"
      }`}
    >
      {label}
    </button>
  )
}

function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState("")

  function addTag() {
    const trimmed = input.trim()
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed])
    }
    setInput("")
  }

  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full bg-[#fff8c5] px-2.5 py-0.5 text-[12px] font-medium text-[#9a6700]"
          >
            {v}
            <button type="button" onClick={() => onChange(values.filter((t) => t !== v))}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag() } }}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-[#d0d7de] bg-white px-3 py-[7px] text-[13px] text-[#1f2328] outline-none placeholder:text-[#8b949e] focus:border-[#0969da] focus:ring-2 focus:ring-[#ddf4ff]"
        />
        <button
          type="button"
          onClick={addTag}
          className="inline-flex items-center gap-1 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 py-[7px] text-[12px] font-medium text-[#1f2328] hover:bg-[#eaeef2]"
        >
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  )
}

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-8 cursor-pointer rounded border border-[#d0d7de]"
      />
      <div>
        <p className="text-[12px] text-[#656d76]">{label}</p>
        <p className="font-mono text-[12px] text-[#1f2328]">{value}</p>
      </div>
    </div>
  )
}

interface FormState {
  project: { name: string; repo: string; description: string }
  voice: { tone: string; audience: string; avoid: string[] }
  ai: { provider: string; model: string; apiKeySource: string }
  images: { enabled: boolean; provider: string; style: string; brandColors: { primary: string; background: string } }
  content: { types: string[]; batchSize: number; platforms: string[]; blogTarget: string }
  connectors: { builtin: string[]; community: string[] }
}

function configToForm(config: Record<string, unknown>): FormState {
  const c = config as Record<string, Record<string, unknown>>
  const project = (c.project ?? {}) as Record<string, string>
  const voice = (c.voice ?? {}) as Record<string, unknown>
  const ai = (c.ai ?? {}) as Record<string, string>
  const images = (c.images ?? {}) as Record<string, unknown>
  const content = (c.content ?? {}) as Record<string, unknown>
  const connectors = (c.connectors ?? {}) as Record<string, string[]>
  const brandColors = (images.brandColors ?? {}) as Record<string, string>

  return {
    project: { name: project.name ?? "", repo: project.repo ?? ".", description: project.description ?? "" },
    voice: { tone: (voice.tone as string) ?? "witty-technical", audience: (voice.audience as string) ?? "developers", avoid: (voice.avoid as string[]) ?? [] },
    ai: { provider: ai.provider ?? "auto", model: ai.model ?? "", apiKeySource: ai.apiKeySource ?? "" },
    images: { enabled: !!images.enabled, provider: (images.provider as string) ?? "openai", style: (images.style as string) ?? "minimal-tech", brandColors: { primary: brandColors.primary ?? "#6366f1", background: brandColors.background ?? "#0f172a" } },
    content: { types: (content.types as string[]) ?? [], batchSize: (content.batchSize as number) ?? 5, platforms: (content.platforms as string[]) ?? [], blogTarget: (content.blogTarget as string) ?? "" },
    connectors: { builtin: connectors.builtin ?? [], community: connectors.community ?? [] },
  }
}

export default function Config() {
  const queryClient = useQueryClient()
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: api.projects.list })
  const { data: providers } = useQuery({ queryKey: ["providers"], queryFn: api.providers.list })

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const activeId = selectedId ?? projects?.[0]?.id ?? null

  const { data: project } = useQuery({
    queryKey: ["project", activeId],
    queryFn: () => api.projects.get(activeId!),
    enabled: !!activeId,
  })

  const [form, setForm] = useState<FormState | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  useEffect(() => {
    if (project?.config) {
      setForm(configToForm(project.config))
      setHasChanges(false)
      setSaveStatus("idle")
    }
  }, [project])

  const saveMutation = useMutation({
    mutationFn: (config: FormState) => api.projects.updateConfig(activeId!, config as unknown as Record<string, unknown>),
    onMutate: () => setSaveStatus("saving"),
    onSuccess: () => {
      setSaveStatus("saved")
      setHasChanges(false)
      queryClient.invalidateQueries({ queryKey: ["project", activeId] })
      setTimeout(() => setSaveStatus("idle"), 2000)
    },
    onError: () => setSaveStatus("error"),
  })

  function updateForm<K extends keyof FormState>(section: K, updates: Partial<FormState[K]>) {
    if (!form) return
    setForm({ ...form, [section]: { ...form[section], ...updates } })
    setHasChanges(true)
    setSaveStatus("idle")
  }

  function resetForm() {
    if (project?.config) {
      setForm(configToForm(project.config))
      setHasChanges(false)
      setSaveStatus("idle")
    }
  }

  const providerOptions = [
    { value: "auto", label: "Auto-detect" },
    ...(providers ?? []).map((p: ProviderInfo) => ({
      value: p.name,
      label: `${p.name} [${p.source}]`,
    })),
  ]

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[#d0d7de] py-16">
        <p className="text-[13px] font-medium text-[#656d76]">No project found</p>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#d0d7de] border-t-[#0969da]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {projects && projects.length > 1 && (
        <select
          value={activeId ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-md border border-[#d0d7de] bg-white px-3 py-2 text-sm text-[#1f2328] outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#ddf4ff]"
        >
          {projects.map((p: ProjectRow) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      <div className="sticky top-0 z-10 flex items-center justify-between rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-[14px] font-semibold text-[#1f2328]">{form.project.name || "Project Settings"}</h2>
          {hasChanges && (
            <span className="rounded-full bg-[#fff8c5] px-2 py-0.5 text-[11px] font-medium text-[#9a6700]">Unsaved changes</span>
          )}
          {saveStatus === "saved" && (
            <span className="rounded-full bg-[#dafbe1] px-2 py-0.5 text-[11px] font-medium text-[#1a7f37]">Saved</span>
          )}
          {saveStatus === "error" && (
            <span className="rounded-full bg-[#ffebe9] px-2 py-0.5 text-[11px] font-medium text-[#cf222e]">Failed to save</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetForm}
            disabled={!hasChanges}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#d0d7de] bg-white px-3 py-[6px] text-[12px] font-medium text-[#1f2328] hover:bg-[#f6f8fa] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={13} /> Reset
          </button>
          <button
            type="button"
            onClick={() => form && saveMutation.mutate(form)}
            disabled={!hasChanges || saveStatus === "saving"}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#1b7f37] bg-[#2da44e] px-3 py-[6px] text-[12px] font-medium text-white hover:bg-[#2c974b] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save size={13} /> {saveStatus === "saving" ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>

      <div className="rounded-md border border-[#d0d7de] bg-white p-6">
        <SectionHeader title="Project" description="Basic project identification" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <FieldLabel label="Project name" htmlFor="project-name" />
            <TextInput id="project-name" value={form.project.name} onChange={(v) => updateForm("project", { name: v })} />
          </div>
          <div>
            <FieldLabel label="Repository path" htmlFor="project-repo" />
            <TextInput id="project-repo" value={form.project.repo} onChange={(v) => updateForm("project", { repo: v })} />
          </div>
          <div className="md:col-span-2">
            <FieldLabel label="Description" htmlFor="project-desc" />
            <TextInput id="project-desc" value={form.project.description} onChange={(v) => updateForm("project", { description: v })} placeholder="A short description of your project" />
          </div>
        </div>
      </div>

      <div className="rounded-md border border-[#d0d7de] bg-white p-6">
        <SectionHeader title="Voice & Tone" description="Control how your content sounds" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <FieldLabel label="Tone" htmlFor="voice-tone" />
            <SelectInput
              id="voice-tone"
              value={form.voice.tone}
              onChange={(v) => updateForm("voice", { tone: v })}
              options={TONE_OPTIONS.map((t) => ({ value: t, label: t.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()) }))}
            />
          </div>
          <div>
            <FieldLabel label="Target audience" htmlFor="voice-audience" />
            <TextInput id="voice-audience" value={form.voice.audience} onChange={(v) => updateForm("voice", { audience: v })} placeholder="e.g. developers, founders, marketers" />
          </div>
          <div className="md:col-span-2">
            <FieldLabel label="Phrases to avoid" />
            <TagInput values={form.voice.avoid} onChange={(v) => updateForm("voice", { avoid: v })} placeholder="Add a phrase to avoid" />
          </div>
        </div>
      </div>

      <div className="rounded-md border border-[#d0d7de] bg-white p-6">
        <SectionHeader title="AI Provider" description="Choose which AI model generates your content" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <FieldLabel label="Provider" htmlFor="ai-provider" />
            <SelectInput
              id="ai-provider"
              value={form.ai.provider}
              onChange={(v) => updateForm("ai", { provider: v })}
              options={providerOptions}
            />
          </div>
          <div>
            <FieldLabel label="Model" htmlFor="ai-model" />
            {(() => {
              const activeProvider = (providers ?? []).find((p: ProviderInfo) => p.name === form.ai.provider)
              const models = activeProvider?.models ?? []
              if (models.length > 0) {
                return (
                  <SelectInput
                    id="ai-model"
                    value={form.ai.model}
                    onChange={(v) => updateForm("ai", { model: v })}
                    options={[
                      ...(form.ai.model && !models.includes(form.ai.model) ? [{ value: form.ai.model, label: form.ai.model }] : []),
                      ...models.map((m: string) => ({ value: m, label: m })),
                    ]}
                  />
                )
              }
              return (
                <TextInput id="ai-model" value={form.ai.model} onChange={(v) => updateForm("ai", { model: v })} placeholder="e.g. gpt-4o, claude-sonnet-4-20250514" />
              )
            })()}
            <p className="mt-1 text-[11px] text-[#8b949e]">
              {(providers ?? []).find((p: ProviderInfo) => p.name === form.ai.provider)?.models?.length
                ? "Models detected from your provider"
                : "Type a model name or select a provider with detected models"}
            </p>
          </div>
          <div className="md:col-span-2">
            <FieldLabel label="API key source" htmlFor="ai-key" />
            <TextInput id="ai-key" value={form.ai.apiKeySource} onChange={(v) => updateForm("ai", { apiKeySource: v })} placeholder="env:OPENAI_API_KEY or leave empty for local" />
            <p className="mt-1 text-[11px] text-[#8b949e]">Use env:VAR_NAME to read from environment, or leave empty for local CLI providers</p>
          </div>
        </div>

        {providers && providers.length > 0 && (
          <div className="mt-5 rounded-md bg-[#f6f8fa] p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#656d76]">Detected Providers</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map((p: ProviderInfo) => {
                const Icon = providerTypeIcons[p.type] ?? Globe
                const isActive = form.ai.provider === p.name
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      updateForm("ai", { provider: p.name, model: p.model ?? form.ai.model })
                    }}
                    className={`flex items-center gap-2.5 rounded-md border p-2.5 text-left transition-colors ${
                      isActive
                        ? "border-[#0969da] bg-[#ddf4ff]"
                        : "border-[#d0d7de] bg-white hover:border-[#8b949e]"
                    }`}
                  >
                    <Icon size={16} className={isActive ? "text-[#0969da]" : "text-[#656d76]"} />
                    <div className="min-w-0">
                      <p className={`truncate text-[12px] font-medium ${isActive ? "text-[#0969da]" : "text-[#1f2328]"}`}>{p.name}</p>
                      <p className="truncate text-[11px] text-[#8b949e]">{p.source}{p.isLocal ? " · local" : ""}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border border-[#d0d7de] bg-white p-6">
        <SectionHeader title="Content" description="What types of content to generate and where to publish" />
        <div className="space-y-5">
          <div>
            <FieldLabel label="Content types" />
            <div className="mt-2 flex flex-wrap gap-2">
              {CONTENT_TYPE_OPTIONS.map((ct) => (
                <TogglePill
                  key={ct.id}
                  label={ct.label}
                  active={form.content.types.includes(ct.id)}
                  onClick={() => {
                    const types = form.content.types.includes(ct.id)
                      ? form.content.types.filter((t) => t !== ct.id)
                      : [...form.content.types, ct.id]
                    updateForm("content", { types })
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <FieldLabel label="Platforms" />
            <div className="mt-2 flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((pl) => (
                <TogglePill
                  key={pl.id}
                  label={pl.label}
                  active={form.content.platforms.includes(pl.id)}
                  onClick={() => {
                    const platforms = form.content.platforms.includes(pl.id)
                      ? form.content.platforms.filter((p) => p !== pl.id)
                      : [...form.content.platforms, pl.id]
                    updateForm("content", { platforms })
                  }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <FieldLabel label="Batch size" htmlFor="content-batch" />
              <input
                id="content-batch"
                type="number"
                min={1}
                max={20}
                value={form.content.batchSize}
                onChange={(e) => updateForm("content", { batchSize: parseInt(e.target.value) || 5 })}
                className="mt-1.5 w-full rounded-md border border-[#d0d7de] bg-white px-3 py-[7px] text-[13px] text-[#1f2328] outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#ddf4ff]"
              />
              <p className="mt-1 text-[11px] text-[#8b949e]">Drafts per generation run</p>
            </div>
            <div>
              <FieldLabel label="Blog target" htmlFor="content-blog" />
              <SelectInput
                id="content-blog"
                value={form.content.blogTarget}
                onChange={(v) => updateForm("content", { blogTarget: v })}
                options={[
                  { value: "", label: "None" },
                  { value: "devto", label: "Dev.to" },
                  { value: "hashnode", label: "Hashnode" },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-[#d0d7de] bg-white p-6">
        <SectionHeader title="Image Generation" description="Configure AI-generated images for your posts" />
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-3">
            <div
              className={`relative h-5 w-9 rounded-full transition-colors ${form.images.enabled ? "bg-[#2da44e]" : "bg-[#d0d7de]"}`}
              onClick={() => updateForm("images", { enabled: !form.images.enabled })}
            >
              <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.images.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            <span className="text-[13px] font-medium text-[#1f2328]">Enable image generation</span>
          </label>

          {form.images.enabled && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FieldLabel label="Image provider" htmlFor="img-provider" />
                <SelectInput
                  id="img-provider"
                  value={form.images.provider}
                  onChange={(v) => updateForm("images", { provider: v })}
                  options={[
                    { value: "openai", label: "OpenAI (DALL-E 3)" },
                    { value: "stability", label: "Stability AI (SD3)" },
                    { value: "local", label: "Local Stable Diffusion" },
                  ]}
                />
              </div>
              <div>
                <FieldLabel label="Style" htmlFor="img-style" />
                <SelectInput
                  id="img-style"
                  value={form.images.style}
                  onChange={(v) => updateForm("images", { style: v })}
                  options={IMAGE_STYLE_OPTIONS.map((s) => ({ value: s, label: s.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()) }))}
                />
              </div>
              <div>
                <FieldLabel label="Brand colors" />
                <div className="mt-2 flex gap-6">
                  <ColorInput label="Primary" value={form.images.brandColors.primary} onChange={(v) => updateForm("images", { brandColors: { ...form.images.brandColors, primary: v } })} />
                  <ColorInput label="Background" value={form.images.brandColors.background} onChange={(v) => updateForm("images", { brandColors: { ...form.images.brandColors, background: v } })} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
