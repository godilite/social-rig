import { useQuery } from "@tanstack/react-query"
import { api } from "../lib/api"
import type { ProjectRow } from "../lib/api"
import { useState } from "react"
import { Settings, Code } from "lucide-react"

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
    <div className="space-y-6">
      {projects && projects.length > 1 && (
        <select
          value={activeId ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        >
          {projects.map((p: ProjectRow) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      {!project ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
            <Settings size={24} className="text-slate-300" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-400">No project selected</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-base font-bold text-slate-900">{project.name}</h2>
            <p className="mt-0.5 text-[13px] text-slate-400">{project.repo}</p>
          </div>

          <div className="divide-y divide-slate-50 px-6">
            {project.config ? (
              Object.entries(project.config).map(([section, value]) => (
                <div key={section} className="py-5">
                  <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-slate-400">
                    <Code size={14} />
                    {section}
                  </h3>
                  <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-[12px] leading-relaxed text-slate-300">
                    {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                  </pre>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-400">
                  No configuration file found. Run <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-indigo-500">social-rig init</code> to create one.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
