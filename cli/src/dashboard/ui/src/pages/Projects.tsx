import { useQuery } from "@tanstack/react-query"
import { api } from "../lib/api"
import type { ProjectRow } from "../lib/api"

export default function Projects() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects.list,
  })

  if (isLoading) return <div className="loading">Loading projects...</div>

  return (
    <div>
      <h1 className="page-title">Projects</h1>

      {!projects?.length ? (
        <div className="empty-state">
          No projects found. Run <code>social-rig init</code> to create one.
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((p: ProjectRow) => (
            <div key={p.id} className="project-card">
              <h3>{p.name}</h3>
              <div className="repo">{p.repo}</div>
              {p.description && <div className="desc">{p.description}</div>}
              <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Created {new Date(p.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
