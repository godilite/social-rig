import { useQuery } from "@tanstack/react-query"
import { api } from "../lib/api"
import type { ConnectorInfo } from "../lib/api"
import { Plug, Check, X } from "lucide-react"

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!connectors?.length ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
            <Plug size={24} className="text-slate-300" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-400">No connectors installed</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {connectors.map((c: ConnectorInfo) => (
            <div
              key={c.id}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-slate-200 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
                  <Plug size={18} className="text-sky-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{c.name}</h3>
                  <p className="text-[11px] font-mono text-slate-400">{c.id}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Capabilities
                </p>
                <div className="space-y-1.5">
                  {Object.entries(capLabels).map(([key, label]) => {
                    const supported = c.capabilities[key as keyof typeof c.capabilities] === true
                    return (
                      <div key={key} className="flex items-center justify-between text-[12px]">
                        <span className="text-slate-500">{label}</span>
                        {supported ? (
                          <Check size={14} className="text-emerald-500" />
                        ) : (
                          <X size={14} className="text-slate-300" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-3 text-[11px] text-slate-400">
                Max length: <span className="font-semibold text-slate-600">{c.capabilities.maxLength.toLocaleString()}</span> chars
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
