import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../lib/api"
import type { DraftRow, DraftWithVariants } from "../lib/api"
import { X, Check, Trash2 } from "lucide-react"

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

  if (isLoading) return <div className="loading">Loading drafts...</div>

  return (
    <div>
      <h1 className="page-title">Drafts</h1>

      <div className="filter-bar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="published">Published</option>
        </select>
        <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
          <option value="">All platforms</option>
          <option value="x">X</option>
          <option value="linkedin">LinkedIn</option>
          <option value="devto">Dev.to</option>
          <option value="hashnode">Hashnode</option>
        </select>
      </div>

      {!drafts?.length ? (
        <div className="empty-state">No drafts found</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Framework</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((d: DraftRow) => (
                <tr key={d.id} style={{ cursor: "pointer" }} onClick={() => setSelectedId(d.id)}>
                  <td>{d.content_type.replace(/_/g, " ")}</td>
                  <td>{d.framework}</td>
                  <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                  <td>{new Date(d.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }} onClick={(e) => e.stopPropagation()}>
                      {d.status === "pending" && (
                        <>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => updateStatus.mutate({ id: d.id, status: "approved" })}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => updateStatus.mutate({ id: d.id, status: "rejected" })}
                          >
                            <X size={14} />
                          </button>
                        </>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => deleteDraft.mutate(d.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && selected && (
        <>
          <div className="overlay" onClick={() => setSelectedId(null)} />
          <DraftDetail draft={selected} onClose={() => setSelectedId(null)} />
        </>
      )}
    </div>
  )
}

function DraftDetail({ draft, onClose }: { draft: DraftWithVariants; onClose: () => void }) {
  return (
    <div className="detail-panel">
      <button className="close-btn" onClick={onClose}><X size={20} /></button>
      <h2 style={{ marginBottom: "0.25rem" }}>{draft.content_type.replace(/_/g, " ")}</h2>
      <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: "1rem" }}>
        {draft.framework} &middot; <span className={`badge badge-${draft.status}`}>{draft.status}</span>
      </p>

      <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>Variants</h3>
      {draft.variants.map((v) => (
        <div key={v.id} className="variant-card">
          <div className="platform-tag">{v.platform}</div>
          {v.headline && <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{v.headline}</div>}
          <div className="body-text">{v.body}</div>
          {v.cta && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.8125rem", color: "var(--accent)" }}>
              CTA: {v.cta}
            </div>
          )}
          {v.hashtags_json && (
            <div style={{ marginTop: "0.375rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {JSON.parse(v.hashtags_json).join(" ")}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
