import { useQuery } from "@tanstack/react-query"
import { api } from "../lib/api"
import type { ProjectRow } from "../lib/api"
import { FolderOpen, GitBranch, ExternalLink } from "lucide-react"

export default function Projects() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects.list,
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
      {!projects?.length ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
            <FolderOpen size={24} className="text-slate-300" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-400">No projects found</p>
          <p className="mt-1 text-[12px] text-slate-300">Run social-rig init to create one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p: ProjectRow) => (
            <div
              key={p.id}
              className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-slate-200 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                  <FolderOpen size={18} className="text-violet-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-slate-900">{p.name}</h3>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-slate-400">
                    <GitBranch size={12} />
                    <span className="truncate">{p.repo}</span>
                  </div>
                </div>
                <ExternalLink size={14} className="shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              {p.description && (
                <p className="mt-3 text-[13px] leading-relaxed text-slate-500">{p.description}</p>
              )}
              <div className="mt-4 border-t border-slate-50 pt-3">
                <p className="text-[11px] font-medium text-slate-300">
                  Created {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
