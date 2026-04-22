import { useQuery } from "@tanstack/react-query"
import { api } from "../lib/api"
import type { ProjectRow } from "../lib/api"
import { useState } from "react"

export default function Config() {
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects.list,
  })

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const activeId = selectedId ?? projects?.[0]?.id ?? null

  const { data: project } = useQuery({
    queryKey: ["project", activeId],
    queryFn: () => api.projects.get(activeId!),
    enabled: !!activeId,
  })

  return (
    <div>
      <h1 className="page-title">Configuration</h1>

      {projects && projects.length > 1 && (
        <div className="filter-bar">
          <select value={activeId ?? ""} onChange={(e) => setSelectedId(e.target.value)}>
            {projects.map((p: ProjectRow) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {!project ? (
        <div className="empty-state">No project selected</div>
      ) : (
        <div className="card">
          <h2 className="card-title">{project.name}</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: "1rem" }}>
            {project.repo}
          </p>

          {project.config ? (
            Object.entries(project.config).map(([section, value]) => (
              <div key={section} className="config-section">
                <h3>{section}</h3>
                <div className="config-value">
                  {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: "var(--text-muted)" }}>
              No configuration file found. Run <code>social-rig init</code> to create one.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
