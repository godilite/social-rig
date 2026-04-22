import { useQuery } from "@tanstack/react-query"
import { api } from "../lib/api"
import { formatRelativeTime, formatDate } from "../lib/utils"
import type { ActivityRow, CalendarEntry } from "../lib/api"
import { FileText, CheckCircle2, Send, FolderOpen, Plug, Clock, ArrowUpRight } from "lucide-react"

const statCards = [
  { key: "pending", label: "Pending Review", icon: Clock, color: "text-[#9a6700]", bg: "bg-[#fff8c5]" },
  { key: "approved", label: "Approved", icon: CheckCircle2, color: "text-[#1a7f37]", bg: "bg-[#dafbe1]" },
  { key: "published", label: "Published", icon: Send, color: "text-[#0969da]", bg: "bg-[#ddf4ff]" },
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
            className="rounded-md border border-[#d0d7de] bg-white p-5 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-[#656d76]">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-[#1f2328]">
                  {stats?.drafts[key] ?? 0}
                </p>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-md ${bg}`}>
                <Icon size={18} className={color} />
              </div>
            </div>
          </div>
        ))}

        <div className="rounded-md border border-[#d0d7de] bg-white p-5 transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#656d76]">Projects</p>
              <p className="mt-1 text-2xl font-semibold text-[#1f2328]">{stats?.projects ?? 0}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#fbefff]">
              <FolderOpen size={18} className="text-[#8250df]" />
            </div>
          </div>
        </div>

        <div className="rounded-md border border-[#d0d7de] bg-white p-5 transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#656d76]">Connectors</p>
              <p className="mt-1 text-2xl font-semibold text-[#1f2328]">{stats?.connectors ?? 0}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#ddf4ff]">
              <Plug size={18} className="text-[#0969da]" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-md border border-[#d0d7de] bg-white">
          <div className="flex items-center justify-between border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-3">
            <h2 className="text-[13px] font-semibold text-[#1f2328]">Upcoming Posts</h2>
            <span className="rounded-full bg-[#ddf4ff] px-2 py-0.5 text-[11px] font-semibold text-[#0969da]">
              {upcoming?.length ?? 0} scheduled
            </span>
          </div>
          <div className="divide-y divide-[#d8dee4]">
            {!upcoming?.length ? (
              <div className="py-10 text-center">
                <Clock size={24} className="mx-auto text-[#d0d7de]" />
                <p className="mt-2 text-[13px] text-[#656d76]">No scheduled posts yet</p>
              </div>
            ) : (
              upcoming.slice(0, 5).map((entry: CalendarEntry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#fff8c5]">
                    <Send size={14} className="text-[#9a6700]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[#1f2328]">{entry.platform}</p>
                    <p className="text-[12px] text-[#656d76]">{formatDate(entry.scheduled_at)}</p>
                  </div>
                  <ArrowUpRight size={14} className="text-[#d0d7de]" />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-[#d0d7de] bg-white">
          <div className="flex items-center justify-between border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-3">
            <h2 className="text-[13px] font-semibold text-[#1f2328]">Recent Activity</h2>
          </div>
          <div className="divide-y divide-[#d8dee4]">
            {!activity?.length ? (
              <div className="py-10 text-center">
                <FileText size={24} className="mx-auto text-[#d0d7de]" />
                <p className="mt-2 text-[13px] text-[#656d76]">No activity yet. Generate your first draft.</p>
              </div>
            ) : (
              activity.map((item: ActivityRow) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-[#0969da]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-[#1f2328]">{item.action}</p>
                    <p className="text-[12px] text-[#656d76]">{formatRelativeTime(item.created_at)}</p>
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
