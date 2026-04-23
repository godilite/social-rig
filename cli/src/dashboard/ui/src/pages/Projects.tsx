import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../lib/api"
import type { ProjectRow } from "../lib/api"
import { FolderOpen, GitBranch, Plus, Pencil, Trash2, Check, FolderPlus } from "lucide-react"
import { cn } from "../lib/utils"

function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project: ProjectRow
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="group rounded-md border border-[#d0d7de] bg-white p-5 transition-all hover:bg-[#f6f8fa]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#fbefff]">
          <FolderOpen size={18} className="text-[#8250df]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[#1f2328]">{project.name}</h3>
          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#656d76]">
            <GitBranch size={12} />
            <span className="truncate">{project.repo}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="rounded-md p-1.5 text-[#656d76] transition-colors hover:bg-[#ddf4ff] hover:text-[#0969da]"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-md p-1.5 text-[#656d76] transition-colors hover:bg-[#ffebe9] hover:text-[#cf222e]"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {project.description && (
        <p className="mt-3 text-[13px] leading-relaxed text-[#656d76]">{project.description}</p>
      )}
      {project.config_path && (
        <div className="mt-3 border-t border-[#d8dee4] pt-3">
          <p className="truncate font-mono text-[11px] text-[#8b949e]">{project.config_path}</p>
        </div>
      )}
    </div>
  )
}

function ProjectForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial?: { name: string; repo: string; description: string }
  onSave: (data: { name: string; repo: string; description: string }) => void
  onCancel: () => void
  saving: boolean
  error?: string
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [repo, setRepo] = useState(initial?.repo ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")

  const nameError = !name.trim() ? "Name is required" : null
  const repoError = !repo.trim() ? "Repository path is required" : null

  return (
    <div className="rounded-md border border-[#0969da] bg-white p-5 shadow-sm">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-[13px] font-medium text-[#1f2328]">Project name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-project"
              className={cn(
                "mt-1.5 w-full rounded-md border bg-white px-3 py-[7px] text-[13px] text-[#1f2328] outline-none placeholder:text-[#8b949e]",
                nameError && name !== "" ? "border-[#cf222e] focus:ring-[#ffebe9]" : "border-[#d0d7de] focus:border-[#0969da] focus:ring-2 focus:ring-[#ddf4ff]",
              )}
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#1f2328]">Repository path</label>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="/path/to/your/repo"
              className={cn(
                "mt-1.5 w-full rounded-md border bg-white px-3 py-[7px] text-[13px] text-[#1f2328] outline-none placeholder:text-[#8b949e]",
                repoError && repo !== "" ? "border-[#cf222e] focus:ring-[#ffebe9]" : "border-[#d0d7de] focus:border-[#0969da] focus:ring-2 focus:ring-[#ddf4ff]",
              )}
            />
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#1f2328]">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short description of your project"
            className="mt-1.5 w-full rounded-md border border-[#d0d7de] bg-white px-3 py-[7px] text-[13px] text-[#1f2328] outline-none placeholder:text-[#8b949e] focus:border-[#0969da] focus:ring-2 focus:ring-[#ddf4ff]"
          />
        </div>
        {error && (
          <p className="text-[12px] text-[#cf222e]">{error}</p>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-[#d8dee4] pt-4">
          <button
            onClick={onCancel}
            className="rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 py-[6px] text-[12px] font-medium text-[#1f2328] hover:bg-[#eaeef2]"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ name: name.trim(), repo: repo.trim(), description: description.trim() })}
            disabled={saving || !name.trim() || !repo.trim()}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#1b7f37] bg-[#2da44e] px-3 py-[6px] text-[12px] font-medium text-white hover:bg-[#2c974b] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check size={13} /> {saving ? "Saving..." : initial ? "Update" : "Create project"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Projects() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects.list,
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; repo: string; description?: string }) =>
      api.projects.create(data),
    onSuccess: () => {
      setShowCreate(false)
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; repo?: string; description?: string } }) =>
      api.projects.update(id, data),
    onSuccess: () => {
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.projects.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
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
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[#656d76]">{projects?.length ?? 0} project(s)</p>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#1b7f37] bg-[#2da44e] px-3 py-[6px] text-[12px] font-medium text-white hover:bg-[#2c974b]"
          >
            <Plus size={14} /> New project
          </button>
        )}
      </div>

      {showCreate && (
        <ProjectForm
          onSave={(data) => createMutation.mutate(data)}
          onCancel={() => { setShowCreate(false); createMutation.reset() }}
          saving={createMutation.isPending}
          error={createMutation.error?.message}
        />
      )}

      {!projects?.length && !showCreate ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[#d0d7de] py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-[#f6f8fa]">
            <FolderPlus size={24} className="text-[#d0d7de]" />
          </div>
          <p className="mt-4 text-[13px] font-medium text-[#656d76]">No projects found</p>
          <p className="mt-1 text-[12px] text-[#8b949e]">Add a project from the dashboard or run social-rig init</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-[#1b7f37] bg-[#2da44e] px-3 py-[6px] text-[12px] font-medium text-white hover:bg-[#2c974b]"
          >
            <Plus size={14} /> New project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects?.map((p: ProjectRow) =>
            editingId === p.id ? (
              <ProjectForm
                key={p.id}
                initial={{ name: p.name, repo: p.repo, description: p.description ?? "" }}
                onSave={(data) => updateMutation.mutate({ id: p.id, data })}
                onCancel={() => { setEditingId(null); updateMutation.reset() }}
                saving={updateMutation.isPending}
                error={updateMutation.error?.message}
              />
            ) : (
              <ProjectCard
                key={p.id}
                project={p}
                onEdit={() => setEditingId(p.id)}
                onDelete={() => {
                  if (confirm(`Delete project "${p.name}"? This will not remove any files.`)) {
                    deleteMutation.mutate(p.id)
                  }
                }}
              />
            ),
          )}
        </div>
      )}
    </div>
  )
}
