import { useQuery } from "@tanstack/react-query"
import { api } from "../lib/api"
import type { ConnectorInfo } from "../lib/api"

const capLabels: Record<string, string> = {
  supportsThreads: "Threads",
  supportsArticle: "Articles",
  supportsScheduling: "Scheduling",
  supportsAnalytics: "Analytics",
  supportsMedia: "Media",
  supportsDraftUpdate: "Draft Update",
  supportsCarousel: "Carousel",
}

export default function Plugins() {
  const { data: connectors, isLoading } = useQuery({
    queryKey: ["connectors"],
    queryFn: api.connectors.list,
  })

  if (isLoading) return <div className="loading">Loading connectors...</div>

  return (
    <div>
      <h1 className="page-title">Connectors</h1>

      {!connectors?.length ? (
        <div className="empty-state">No connectors installed</div>
      ) : (
        <div className="connector-grid">
          {connectors.map((c: ConnectorInfo) => (
            <div key={c.id} className="connector-card">
              <h3>{c.name}</h3>
              <div className="id">{c.id}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Max length: {c.capabilities.maxLength}
              </div>
              <div className="caps">
                {Object.entries(capLabels).map(([key, label]) => (
                  c.capabilities[key as keyof typeof c.capabilities] === true && (
                    <span key={key} className="badge badge-capability">{label}</span>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
