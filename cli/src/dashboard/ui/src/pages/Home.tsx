import { useQuery } from "@tanstack/react-query"
import { api } from "../lib/api"
import type { ActivityRow, CalendarEntry } from "../lib/api"

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function Home() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: api.stats })
  const { data: activity } = useQuery({
    queryKey: ["activity"],
    queryFn: () => api.activity({ limit: "10" }),
  })
  const { data: upcoming } = useQuery({
    queryKey: ["calendar-upcoming"],
    queryFn: () => api.calendar.list({ status: "scheduled" }),
  })

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Pending Drafts</div>
          <div className="value">{stats?.drafts.pending ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Approved</div>
          <div className="value" style={{ color: "var(--success)" }}>{stats?.drafts.approved ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Published</div>
          <div className="value" style={{ color: "var(--accent)" }}>{stats?.drafts.published ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Projects</div>
          <div className="value">{stats?.projects ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Connectors</div>
          <div className="value">{stats?.connectors ?? 0}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="card">
          <h2 className="card-title">Upcoming</h2>
          {!upcoming?.length ? (
            <p className="empty-state" style={{ padding: "1rem" }}>No scheduled posts</p>
          ) : (
            upcoming.slice(0, 5).map((entry: CalendarEntry) => (
              <div key={entry.id} className="activity-item">
                <div className="activity-dot" style={{ background: "var(--warning)" }} />
                <div>
                  <div className="activity-text">
                    <span className="badge badge-scheduled">{entry.platform}</span>
                  </div>
                  <div className="activity-time">{formatDate(entry.scheduled_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Recent Activity</h2>
          {!activity?.length ? (
            <p className="empty-state" style={{ padding: "1rem" }}>No activity yet</p>
          ) : (
            activity.map((item: ActivityRow) => (
              <div key={item.id} className="activity-item">
                <div className="activity-dot" />
                <div>
                  <div className="activity-text">{item.action}</div>
                  <div className="activity-time">{formatTime(item.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
