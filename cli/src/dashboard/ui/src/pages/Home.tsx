import { useQuery } from "@tanstack/react-query"
import { api } from "../lib/api"
import { formatRelativeTime, formatDate } from "../lib/utils"
import type { ActivityRow, CalendarEntry } from "../lib/api"
import { FileText, CheckCircle2, Send, FolderOpen, Plug, Clock, ArrowUpRight } from "lucide-react"

const statCards = [
  { key: "pending", label: "Pending Review", icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
  { key: "approved", label: "Approved", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
  { key: "published", label: "Published", icon: Send, color: "text-indigo-500", bg: "bg-indigo-50" },
] as const

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
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map(({ key, label, icon: Icon, color, bg }) => (
          <div
            key={key}
            className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                  {stats?.drafts[key] ?? 0}
                </p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
                <Icon size={20} className={color} />
              </div>
            </div>
          </div>
        ))}

        <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Projects</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{stats?.projects ?? 0}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
              <FolderOpen size={20} className="text-violet-500" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Connectors</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{stats?.connectors ?? 0}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
              <Plug size={20} className="text-sky-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Upcoming Posts</h2>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-600">
              {upcoming?.length ?? 0} scheduled
            </span>
          </div>
          <div className="divide-y divide-slate-50 px-6">
            {!upcoming?.length ? (
              <div className="py-10 text-center">
                <Clock size={28} className="mx-auto text-slate-200" />
                <p className="mt-2 text-sm text-slate-400">No scheduled posts yet</p>
              </div>
            ) : (
              upcoming.slice(0, 5).map((entry: CalendarEntry) => (
                <div key={entry.id} className="flex items-center gap-4 py-3.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                    <Send size={14} className="text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{entry.platform}</p>
                    <p className="text-[12px] text-slate-400">{formatDate(entry.scheduled_at)}</p>
                  </div>
                  <ArrowUpRight size={14} className="text-slate-300" />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-slate-50 px-6">
            {!activity?.length ? (
              <div className="py-10 text-center">
                <FileText size={28} className="mx-auto text-slate-200" />
                <p className="mt-2 text-sm text-slate-400">No activity yet. Generate your first draft.</p>
              </div>
            ) : (
              activity.map((item: ActivityRow) => (
                <div key={item.id} className="flex items-center gap-4 py-3.5">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-600">{item.action}</p>
                    <p className="text-[12px] text-slate-400">{formatRelativeTime(item.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
