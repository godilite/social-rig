import { useState, useRef } from "react"
import { createPortal } from "react-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../lib/api"
import type { DraftRow, DraftWithVariants } from "../lib/api"
import { X, Check, Trash2, FileText, Eye, ChevronRight, Hash, ExternalLink, ImagePlus, Upload } from "lucide-react"
import { cn, formatRelativeTime } from "../lib/utils"

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: "Pending", bg: "bg-[#fff8c5]", text: "text-[#9a6700]", dot: "bg-[#bf8700]" },
  approved: { label: "Approved", bg: "bg-[#dafbe1]", text: "text-[#1a7f37]", dot: "bg-[#2da44e]" },
  rejected: { label: "Rejected", bg: "bg-[#ffebe9]", text: "text-[#cf222e]", dot: "bg-[#cf222e]" },
  published: { label: "Published", bg: "bg-[#ddf4ff]", text: "text-[#0969da]", dot: "bg-[#0969da]" },
}

const platformIcons: Record<string, string> = {
  x: "𝕏",
  twitter: "𝕏",
  linkedin: "in",
  devto: "DEV",
  hashnode: "#",
  bluesky: "🦋",
  mastodon: "🐘",
  reddit: "r/",
}

const platformThemes: Record<string, { accent: string; bg: string; avatar: string; name: string }> = {
  x: { accent: "#1f2328", bg: "#ffffff", avatar: "bg-[#1f2328]", name: "X (Twitter)" },
  twitter: { accent: "#1f2328", bg: "#ffffff", avatar: "bg-[#1f2328]", name: "X (Twitter)" },
  linkedin: { accent: "#0a66c2", bg: "#f3f6f8", avatar: "bg-[#0a66c2]", name: "LinkedIn" },
  devto: { accent: "#1f2328", bg: "#fafafa", avatar: "bg-[#1f2328]", name: "Dev.to" },
  hashnode: { accent: "#2962ff", bg: "#ffffff", avatar: "bg-[#2962ff]", name: "Hashnode" },
  bluesky: { accent: "#0085ff", bg: "#ffffff", avatar: "bg-[#0085ff]", name: "Bluesky" },
  mastodon: { accent: "#6364ff", bg: "#ffffff", avatar: "bg-[#6364ff]", name: "Mastodon" },
  reddit: { accent: "#ff4500", bg: "#ffffff", avatar: "bg-[#ff4500]", name: "Reddit" },
}

function PostPreview({ body, headline }: { body: string; headline?: string | null }) {
  const paragraphs = body.split(/\n{2,}/).filter(Boolean)

  return (
    <div className="space-y-2.5">
      {headline && (
        <h4 className="text-[15px] font-bold leading-snug text-[#1f2328]">{headline}</h4>
      )}
      {paragraphs.map((p, i) => {
        const lines = p.split("\n")
        return (
          <div key={i} className="text-[13.5px] leading-[1.65] text-[#1f2328]">
            {lines.map((line, j) => {
              const rendered = renderLine(line)
              return (
                <span key={j}>
                  {j > 0 && <br />}
                  {rendered}
                </span>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function renderLine(line: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)|(\[([^\]]+)\]\(([^)]+)\))/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index))
    }
    if (match[1]) {
      parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>)
    } else if (match[3]) {
      parts.push(
        <code key={match.index} className="rounded bg-[#f6f8fa] px-1 py-0.5 font-mono text-[12px] text-[#0969da]">
          {match[4]}
        </code>
      )
    } else if (match[5]) {
      parts.push(
        <a key={match.index} href={match[7]} target="_blank" rel="noopener noreferrer" className="text-[#0969da] hover:underline">
          {match[6]}
        </a>
      )
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex))
  }
  return parts.length > 0 ? parts : line
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.pending
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", config.bg, config.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  )
}

export default function Drafts() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("")
  const [platformFilter, setPlatformFilter] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const params: Record<string, string> = {}
  if (statusFilter) params.status = statusFilter
  if (platformFilter) params.platform = platformFilter

  const { data: drafts, isLoading } = useQuery({
    queryKey: ["drafts", params],
    queryFn: () => api.drafts.list(params),
  })

  const { data: selected } = useQuery({
    queryKey: ["draft", selectedId],
    queryFn: () => api.drafts.get(selectedId!),
    enabled: !!selectedId,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.drafts.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] })
      queryClient.invalidateQueries({ queryKey: ["draft"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
    },
  })

  const deleteDraft = useMutation({
    mutationFn: (id: string) => api.drafts.delete(id),
    onSuccess: () => {
      setSelectedId(null)
      queryClient.invalidateQueries({ queryKey: ["drafts"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {["", "pending", "approved", "rejected", "published"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors",
              statusFilter === s
                ? "bg-[#24292f] text-white"
                : "bg-[#f6f8fa] text-[#656d76] hover:bg-[#eaeef2]",
            )}
          >
            {s || "All"}
          </button>
        ))}

        <div className="ml-auto">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="rounded-md border border-[#d0d7de] bg-white px-3 py-1.5 text-[13px] text-[#656d76] outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#ddf4ff]"
          >
            <option value="">All platforms</option>
            <option value="x">X</option>
            <option value="linkedin">LinkedIn</option>
            <option value="devto">Dev.to</option>
            <option value="hashnode">Hashnode</option>
          </select>
        </div>
      </div>

      {!drafts?.length ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[#d0d7de] py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-[#f6f8fa]">
            <FileText size={24} className="text-[#d0d7de]" />
          </div>
          <p className="mt-4 text-[13px] font-medium text-[#656d76]">No drafts found</p>
          <p className="mt-1 text-[12px] text-[#8b949e]">Generate content with: social-rig generate</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((d: DraftRow) => (
            <div
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              className="group flex cursor-pointer items-center gap-4 rounded-md border border-[#d0d7de] bg-white p-4 transition-all hover:bg-[#f6f8fa]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#f6f8fa]">
                <FileText size={18} className="text-[#656d76]" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13px] font-semibold capitalize text-[#1f2328]">
                    {d.content_type.replace(/_/g, " ")}
                  </p>
                  <span className="shrink-0 rounded-full bg-[#f6f8fa] px-2 py-0.5 text-[11px] font-medium text-[#656d76]">
                    {d.framework}
                  </span>
                </div>
                {d.source_facts_json && (() => {
                  try {
                    const facts = JSON.parse(d.source_facts_json)
                    const firstClaim = Array.isArray(facts) && facts[0]?.claim
                    if (firstClaim) return (
                      <p className="mt-0.5 truncate text-[12px] text-[#656d76]">{firstClaim}</p>
                    )
                  } catch {}
                  return null
                })()}
                <p className="mt-0.5 text-[11px] text-[#8b949e]">
                  {formatRelativeTime(d.created_at)}
                </p>
              </div>

              <StatusBadge status={d.status} />

              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {d.status === "pending" && (
                  <>
                    <button
                      onClick={() => updateStatus.mutate({ id: d.id, status: "approved" })}
                      className="rounded-md p-2 text-[#1a7f37] transition-colors hover:bg-[#dafbe1]"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => updateStatus.mutate({ id: d.id, status: "rejected" })}
                      className="rounded-md p-2 text-[#cf222e] transition-colors hover:bg-[#ffebe9]"
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => deleteDraft.mutate(d.id)}
                  className="rounded-md p-2 text-[#d0d7de] transition-colors hover:bg-[#ffebe9] hover:text-[#cf222e]"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <ChevronRight size={16} className="text-[#d0d7de] transition-transform group-hover:translate-x-0.5" />
            </div>
          ))}
        </div>
      )}

      {selectedId && selected &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedId(null)}
            />
            <DraftDetail
              draft={selected}
              onClose={() => setSelectedId(null)}
              onApprove={() => updateStatus.mutate({ id: selected.id, status: "approved" })}
              onReject={() => updateStatus.mutate({ id: selected.id, status: "rejected" })}
            />
          </>,
          document.body,
        )}
    </div>
  )
}

function DraftDetail({
  draft,
  onClose,
  onApprove,
  onReject,
}: {
  draft: DraftWithVariants
  onClose: () => void
  onApprove: () => void
  onReject: () => void
}) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [urlInput, setUrlInput] = useState("")
  const [showUrlInput, setShowUrlInput] = useState(false)
  const sourceFacts = draft.source_facts_json ? JSON.parse(draft.source_facts_json) : null

  const uploadImage = useMutation({
    mutationFn: (file: File) => api.images.upload(draft.id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["draft", draft.id] })
    },
  })

  const addImageUrl = useMutation({
    mutationFn: (url: string) => api.images.addUrl(draft.id, url),
    onSuccess: () => {
      setUrlInput("")
      setShowUrlInput(false)
      queryClient.invalidateQueries({ queryKey: ["draft", draft.id] })
    },
  })

  const removeImage = useMutation({
    mutationFn: () => api.images.remove(draft.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["draft", draft.id] })
    },
  })

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadImage.mutate(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const imageFilename = draft.image_path ? draft.image_path.split("/").pop() ?? null : null

  return (
    <div className="scrollbar-thin fixed inset-y-0 right-0 z-50 w-full max-w-[560px] overflow-y-auto bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#d0d7de] bg-white/90 px-6 py-4 backdrop-blur-sm">
        <div>
          <h2 className="text-base font-semibold text-[#1f2328]">
            {draft.content_type.replace(/_/g, " ")}
          </h2>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[12px] text-[#656d76]">{draft.framework}</span>
            <StatusBadge status={draft.status} />
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-2 text-[#656d76] transition-colors hover:bg-[#f6f8fa]"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-5 p-6">
        {draft.status === "pending" && (
          <div className="flex gap-3">
            <button
              onClick={onApprove}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#2da44e] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a7f37]"
            >
              <Check size={16} /> Approve
            </button>
            <button
              onClick={onReject}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-[#d0d7de] bg-[#f6f8fa] py-2.5 text-sm font-semibold text-[#cf222e] transition-colors hover:bg-[#ffebe9]"
            >
              <X size={16} /> Reject
            </button>
          </div>
        )}

        <div>
          <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[#656d76]">
            <ImagePlus size={14} /> Image
          </h3>
          {imageFilename ? (
            <div className="overflow-hidden rounded-lg border border-[#d0d7de]">
              <img
                src={api.images.url(imageFilename)}
                alt="Draft image"
                className="w-full object-cover"
                style={{ maxHeight: "280px" }}
              />
              <div className="flex items-center justify-between border-t border-[#d0d7de] bg-[#f6f8fa] px-4 py-2.5">
                <span className="text-[12px] text-[#656d76]">{imageFilename}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-md px-2.5 py-1 text-[12px] font-medium text-[#0969da] transition-colors hover:bg-[#ddf4ff]"
                  >
                    Replace
                  </button>
                  <button
                    onClick={() => removeImage.mutate()}
                    className="rounded-md px-2.5 py-1 text-[12px] font-medium text-[#cf222e] transition-colors hover:bg-[#ffebe9]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#d0d7de] bg-[#f6f8fa] p-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#eaeef2]">
                <Upload size={18} className="text-[#656d76]" />
              </div>
              <p className="mt-3 text-[13px] font-medium text-[#1f2328]">Add an image</p>
              <p className="mt-1 text-[12px] text-[#8b949e]">Upload a file or paste a URL</p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md bg-[#24292f] px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#32383f]"
                >
                  Upload File
                </button>
                <button
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="rounded-md border border-[#d0d7de] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#24292f] transition-colors hover:bg-[#f6f8fa]"
                >
                  From URL
                </button>
              </div>
              {showUrlInput && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/image.png"
                    className="flex-1 rounded-md border border-[#d0d7de] px-3 py-1.5 text-[12px] text-[#1f2328] outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#ddf4ff]"
                  />
                  <button
                    onClick={() => urlInput && addImageUrl.mutate(urlInput)}
                    disabled={!urlInput || addImageUrl.isPending}
                    className="rounded-md bg-[#0969da] px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#0860ca] disabled:opacity-50"
                  >
                    {addImageUrl.isPending ? "..." : "Add"}
                  </button>
                </div>
              )}
              {(uploadImage.isError || addImageUrl.isError) && (
                <p className="mt-2 text-[12px] text-[#cf222e]">
                  {uploadImage.error?.message || addImageUrl.error?.message}
                </p>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[#656d76]">
            <Eye size={14} /> Platform Variants
          </h3>
          <div className="space-y-4">
            {draft.variants.map((v) => {
              const hashtags = v.hashtags_json ? JSON.parse(v.hashtags_json) : []
              const theme = platformThemes[v.platform.toLowerCase()] ?? platformThemes.x
              return (
                <div
                  key={v.id}
                  className="overflow-hidden rounded-lg border border-[#d0d7de] shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white", theme.avatar)}>
                        {platformIcons[v.platform.toLowerCase()] ?? v.platform[0]?.toUpperCase()}
                      </span>
                      <div>
                        <span className="text-[13px] font-semibold text-[#1f2328]">{theme.name}</span>
                        <span className="ml-2 text-[11px] text-[#8b949e]">Preview</span>
                      </div>
                    </div>
                    {v.char_count && (
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        v.char_count > 250 && v.platform.toLowerCase() === "x"
                          ? "bg-[#ffebe9] text-[#cf222e]"
                          : "bg-[#f6f8fa] text-[#8b949e]",
                      )}>
                        {v.char_count} chars
                      </span>
                    )}
                  </div>

                  <div className="bg-white p-5">
                    <PostPreview body={v.body} headline={v.headline} />

                    {hashtags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[#d8dee4] pt-3">
                        {hashtags.map((tag: string, i: number) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-0.5 rounded-full bg-[#ddf4ff] px-2.5 py-0.5 text-[11px] font-medium text-[#0969da]"
                          >
                            <Hash size={10} />
                            {tag.replace(/^#/, "")}
                          </span>
                        ))}
                      </div>
                    )}
                    {v.cta && (
                      <div className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-[#0969da]">
                        <ExternalLink size={12} />
                        {v.cta}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {sourceFacts && (
          <div>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[#656d76]">
              Source Facts
            </h3>
            <div className="rounded-md bg-[#f6f8fa] p-4">
              {Array.isArray(sourceFacts) ? (
                <ul className="space-y-1.5">
                  {sourceFacts.map((fact: unknown, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-[#1f2328]">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#656d76]" />
                      {typeof fact === 'string' ? fact : typeof fact === 'object' && fact !== null && 'claim' in fact ? String((fact as Record<string, unknown>).claim) : JSON.stringify(fact)}
                    </li>
                  ))}
                </ul>
              ) : (
                <pre className="text-[12px] text-[#656d76]">
                  {JSON.stringify(sourceFacts, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
