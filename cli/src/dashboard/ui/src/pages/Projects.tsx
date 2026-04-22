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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#d0d7de] border-t-[#0969da]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!projects?.length ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[#d0d7de] py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-[#f6f8fa]">
            <FolderOpen size={24} className="text-[#d0d7de]" />
          </div>
          <p className="mt-4 text-[13px] font-medium text-[#656d76]">No projects found</p>
          <p className="mt-1 text-[12px] text-[#8b949e]">Run social-rig init to create one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p: ProjectRow) => (
            <div
              key={p.id}
              className="group rounded-md border border-[#d0d7de] bg-white p-5 transition-all hover:bg-[#f6f8fa]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#fbefff]">
                  <FolderOpen size={18} className="text-[#8250df]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-[#1f2328]">{p.name}</h3>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#656d76]">
                    <GitBranch size={12} />
                    <span className="truncate">{p.repo}</span>
                  </div>
                </div>
                <ExternalLink size={14} className="shrink-0 text-[#d0d7de] opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              {p.description && (
                <p className="mt-3 text-[13px] leading-relaxed text-[#656d76]">{p.description}</p>
              )}
              <div className="mt-4 border-t border-[#d8dee4] pt-3">
                <p className="text-[11px] font-medium text-[#8b949e]">
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
