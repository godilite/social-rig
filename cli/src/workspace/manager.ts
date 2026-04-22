import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { homedir } from "node:os"
import { parse, stringify } from "yaml"
import type { Workspace, WorkspaceProject } from "../types.js"
import { createProject, getProjectByName, deleteProject } from "../db/projects.js"

const WORKSPACE_PATH = resolve(homedir(), ".social-rig", "workspace.yaml")

export function loadWorkspace(): Workspace {
  if (!existsSync(WORKSPACE_PATH)) {
    return { projects: [] }
  }

  const raw = readFileSync(WORKSPACE_PATH, "utf-8")
  const parsed = parse(raw) as Workspace | null

  if (!parsed || typeof parsed !== "object") {
    return { projects: [] }
  }

  return {
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    defaultProject: parsed.defaultProject,
  }
}

export function saveWorkspace(workspace: Workspace): void {
  const dir = dirname(WORKSPACE_PATH)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(WORKSPACE_PATH, stringify(workspace, { lineWidth: 120 }), "utf-8")
}

export function registerProject(project: WorkspaceProject): void {
  const workspace = loadWorkspace()

  const exists = workspace.projects.some((p) => p.name === project.name)
  if (exists) {
    throw new Error(`Project "${project.name}" already exists in workspace`)
  }

  workspace.projects.push(project)

  if (!workspace.defaultProject) {
    workspace.defaultProject = project.name
  }

  saveWorkspace(workspace)

  const existing = getProjectByName(project.name)
  if (!existing) {
    createProject({
      name: project.name,
      repo: project.repo,
      configPath: project.configPath,
    })
  }
}

export function getActiveProject(): WorkspaceProject | null {
  const workspace = loadWorkspace()

  if (workspace.projects.length === 0) {
    return null
  }

  if (workspace.defaultProject) {
    const found = workspace.projects.find((p) => p.name === workspace.defaultProject)
    if (found) return found
  }

  return workspace.projects[0]
}

export function switchProject(name: string): void {
  const workspace = loadWorkspace()

  const found = workspace.projects.find((p) => p.name === name)
  if (!found) {
    throw new Error(`Project "${name}" not found in workspace`)
  }

  workspace.defaultProject = name
  saveWorkspace(workspace)
}

export function listWorkspaceProjects(): WorkspaceProject[] {
  return loadWorkspace().projects
}

export function removeProjectFromWorkspace(name: string): void {
  const workspace = loadWorkspace()

  const idx = workspace.projects.findIndex((p) => p.name === name)
  if (idx === -1) {
    throw new Error(`Project "${name}" not found in workspace`)
  }

  workspace.projects.splice(idx, 1)

  if (workspace.defaultProject === name) {
    workspace.defaultProject = workspace.projects[0]?.name
  }

  saveWorkspace(workspace)

  const dbRow = getProjectByName(name)
  if (dbRow) {
    deleteProject(dbRow.id)
  }
}
