import { useState } from "react"
import { createPortal } from "react-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../lib/api"
import type { DraftRow, DraftWithVariants } from "../lib/api"
import { X, Check, Trash2, FileText, Eye, ChevronRight, Hash, ExternalLink } from "lucide-react"
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
                  <p className="truncate text-[13px] font-semibold text-[#1f2328]">
                    {d.content_type.replace(/_/g, " ")}
                  </p>
                  <span className="shrink-0 rounded-full bg-[#f6f8fa] px-2 py-0.5 text-[11px] font-medium text-[#656d76]">
                    {d.framework}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-[#8b949e]">
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
  const sourceFacts = draft.source_facts_json ? JSON.parse(draft.source_facts_json) : null

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
            <Eye size={14} /> Platform Variants
          </h3>
          <div className="space-y-4">
            {draft.variants.map((v) => {
              const hashtags = v.hashtags_json ? JSON.parse(v.hashtags_json) : []
              return (
                <div
                  key={v.id}
                  className="overflow-hidden rounded-md border border-[#d0d7de]"
                >
                  <div className="flex items-center justify-between border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#24292f] text-[10px] font-bold text-white">
                        {platformIcons[v.platform.toLowerCase()] ?? v.platform[0]?.toUpperCase()}
                      </span>
                      <span className="text-[13px] font-semibold text-[#1f2328]">{v.platform}</span>
                    </div>
                    {v.char_count && (
                      <span className="text-[11px] text-[#8b949e]">{v.char_count} chars</span>
                    )}
                  </div>
                  <div className="p-4">
                    {v.headline && (
                      <p className="mb-2 text-sm font-semibold text-[#1f2328]">{v.headline}</p>
                    )}
                    <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#1f2328]">
                      {v.body}
                    </div>
                    {hashtags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {hashtags.map((tag: string, i: number) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-0.5 rounded-full bg-[#ddf4ff] px-2 py-0.5 text-[11px] font-medium text-[#0969da]"
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
