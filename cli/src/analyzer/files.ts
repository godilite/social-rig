import { readFile, readdir, stat } from "node:fs/promises"
import { join, extname } from "node:path"

export interface ManifestInfo {
  type: string
  name?: string
  description?: string
  dependencies: string[]
  devDependencies: string[]
}

export interface ReadmeInfo {
  description: string
  sections: string[]
  features: string[]
}

export interface FileAnalysis {
  readme: ReadmeInfo
  changelog: string[]
  manifests: ManifestInfo[]
  techStack: string[]
  languages: Record<string, number>
}

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "vendor",
  "__pycache__", ".venv", "target", "coverage", ".social-rig",
])

const EXTENSION_LANG: Record<string, string> = {
  ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript",
  ".jsx": "JavaScript", ".go": "Go", ".rs": "Rust", ".py": "Python",
  ".rb": "Ruby", ".java": "Java", ".kt": "Kotlin", ".swift": "Swift",
  ".c": "C", ".cpp": "C++", ".h": "C", ".cs": "C#", ".php": "PHP",
  ".vue": "Vue", ".svelte": "Svelte", ".dart": "Dart", ".ex": "Elixir",
  ".exs": "Elixir", ".zig": "Zig", ".lua": "Lua", ".sh": "Shell",
  ".css": "CSS", ".scss": "SCSS", ".html": "HTML",
}

const KNOWN_FRAMEWORKS: Record<string, string> = {
  react: "React", "react-dom": "React", next: "Next.js", vue: "Vue",
  nuxt: "Nuxt", svelte: "Svelte", angular: "Angular",
  express: "Express", fastify: "Fastify", hono: "Hono", koa: "Koa",
  "nest.js": "NestJS", "@nestjs/core": "NestJS",
  flask: "Flask", django: "Django", fastapi: "FastAPI",
  gin: "Gin", echo: "Echo", fiber: "Fiber",
  actix: "Actix", axum: "Axum", rocket: "Rocket",
  rails: "Rails", sinatra: "Sinatra",
  tailwindcss: "Tailwind CSS", "@tailwindcss/postcss": "Tailwind CSS",
  prisma: "Prisma", drizzle: "Drizzle", typeorm: "TypeORM",
  "@prisma/client": "Prisma", "drizzle-orm": "Drizzle",
  vite: "Vite", webpack: "Webpack", tsup: "tsup", esbuild: "esbuild",
  vitest: "Vitest", jest: "Jest", mocha: "Mocha", playwright: "Playwright",
  typescript: "TypeScript",
}

async function readFileOr(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8")
  } catch {
    return null
  }
}

function parseReadme(content: string): ReadmeInfo {
  const lines = content.split("\n")

  let description = ""
  let foundFirstHeading = false
  const descLines: string[] = []
  for (const line of lines) {
    if (/^#\s/.test(line)) {
      if (foundFirstHeading) break
      foundFirstHeading = true
      continue
    }
    if (foundFirstHeading && line.trim()) {
      descLines.push(line.trim())
    } else if (foundFirstHeading && descLines.length > 0) {
      break
    }
  }
  description = descLines.join(" ")

  const sections: string[] = []
  for (const line of lines) {
    const match = line.match(/^#{1,3}\s+(.+)/)
    if (match) sections.push(match[1].trim())
  }

  const features: string[] = []
  let inFeatures = false
  for (const line of lines) {
    if (/^#{1,3}\s+(features|highlights|what|why)/i.test(line)) {
      inFeatures = true
      continue
    }
    if (inFeatures && /^#{1,3}\s/.test(line)) {
      inFeatures = false
      continue
    }
    if (inFeatures) {
      const bullet = line.match(/^[-*]\s+(.+)/)
      if (bullet) features.push(bullet[1].trim())
    }
  }

  return { description, sections, features }
}

function parseChangelog(content: string): string[] {
  const entries: string[] = []
  for (const line of content.split("\n")) {
    const match = line.match(/^#{1,3}\s+(.+)/)
    if (match) entries.push(match[1].trim())
  }
  return entries
}

async function parsePackageJson(repoPath: string): Promise<ManifestInfo | null> {
  const content = await readFileOr(join(repoPath, "package.json"))
  if (!content) return null
  try {
    const pkg = JSON.parse(content)
    return {
      type: "package.json",
      name: pkg.name,
      description: pkg.description,
      dependencies: Object.keys(pkg.dependencies || {}),
      devDependencies: Object.keys(pkg.devDependencies || {}),
    }
  } catch {
    return null
  }
}

async function parseGoMod(repoPath: string): Promise<ManifestInfo | null> {
  const content = await readFileOr(join(repoPath, "go.mod"))
  if (!content) return null
  const moduleMatch = content.match(/^module\s+(.+)/m)
  const deps: string[] = []
  const reqBlock = content.match(/require\s*\(([\s\S]*?)\)/g)
  if (reqBlock) {
    for (const block of reqBlock) {
      const lines = block.split("\n")
      for (const line of lines) {
        const dep = line.match(/^\s+(\S+)\s/)
        if (dep && !dep[1].startsWith("//")) deps.push(dep[1])
      }
    }
  }
  return {
    type: "go.mod",
    name: moduleMatch?.[1],
    dependencies: deps,
    devDependencies: [],
  }
}

async function parseCargoToml(repoPath: string): Promise<ManifestInfo | null> {
  const content = await readFileOr(join(repoPath, "Cargo.toml"))
  if (!content) return null
  const nameMatch = content.match(/^\s*name\s*=\s*"([^"]+)"/m)
  const descMatch = content.match(/^\s*description\s*=\s*"([^"]+)"/m)
  const deps: string[] = []
  let inDeps = false
  for (const line of content.split("\n")) {
    if (/^\[dependencies\]/.test(line) || /^\[dev-dependencies\]/.test(line)) {
      inDeps = true
      continue
    }
    if (/^\[/.test(line)) {
      inDeps = false
      continue
    }
    if (inDeps) {
      const dep = line.match(/^(\S+)\s*=/)
      if (dep) deps.push(dep[1])
    }
  }
  return {
    type: "Cargo.toml",
    name: nameMatch?.[1],
    description: descMatch?.[1],
    dependencies: deps,
    devDependencies: [],
  }
}

async function parsePyproject(repoPath: string): Promise<ManifestInfo | null> {
  const content = await readFileOr(join(repoPath, "pyproject.toml"))
  if (!content) return null
  const nameMatch = content.match(/^\s*name\s*=\s*"([^"]+)"/m)
  const descMatch = content.match(/^\s*description\s*=\s*"([^"]+)"/m)
  const deps: string[] = []
  let inDeps = false
  for (const line of content.split("\n")) {
    if (/^dependencies\s*=\s*\[/.test(line) || /^\[project\.dependencies\]/.test(line)) {
      inDeps = true
      continue
    }
    if (inDeps && line.trim() === "]") {
      inDeps = false
      continue
    }
    if (inDeps) {
      const dep = line.match(/"([^">=<!\s]+)/)
      if (dep) deps.push(dep[1])
    }
  }
  return {
    type: "pyproject.toml",
    name: nameMatch?.[1],
    description: descMatch?.[1],
    dependencies: deps,
    devDependencies: [],
  }
}

async function parseGemfile(repoPath: string): Promise<ManifestInfo | null> {
  const content = await readFileOr(join(repoPath, "Gemfile"))
  if (!content) return null
  const gems: string[] = []
  for (const line of content.split("\n")) {
    const match = line.match(/^\s*gem\s+['"]([^'"]+)['"]/)
    if (match) gems.push(match[1])
  }
  if (gems.length === 0) return null
  return {
    type: "Gemfile",
    dependencies: gems,
    devDependencies: [],
  }
}

function extractTechStack(manifests: ManifestInfo[]): string[] {
  const stack = new Set<string>()
  for (const manifest of manifests) {
    const allDeps = [...manifest.dependencies, ...manifest.devDependencies]
    for (const dep of allDeps) {
      const framework = KNOWN_FRAMEWORKS[dep]
      if (framework) stack.add(framework)
    }
  }
  return Array.from(stack)
}

async function walkDirectory(
  dirPath: string,
  languages: Record<string, number>
): Promise<void> {
  let entries
  try {
    entries = await readdir(dirPath)
  } catch {
    return
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry) || entry.startsWith(".")) continue
    const fullPath = join(dirPath, entry)
    let info
    try {
      info = await stat(fullPath)
    } catch {
      continue
    }
    if (info.isDirectory()) {
      await walkDirectory(fullPath, languages)
    } else if (info.isFile()) {
      const ext = extname(entry)
      const lang = EXTENSION_LANG[ext]
      if (lang) {
        languages[lang] = (languages[lang] || 0) + 1
      }
    }
  }
}

export async function analyzeFiles(repoPath: string): Promise<FileAnalysis> {
  const readmeContent = await readFileOr(join(repoPath, "README.md"))
    ?? await readFileOr(join(repoPath, "readme.md"))
    ?? await readFileOr(join(repoPath, "Readme.md"))

  const readme = readmeContent
    ? parseReadme(readmeContent)
    : { description: "", sections: [], features: [] }

  const changelogContent = await readFileOr(join(repoPath, "CHANGELOG.md"))
    ?? await readFileOr(join(repoPath, "RELEASES.md"))
    ?? await readFileOr(join(repoPath, "changelog.md"))

  const changelog = changelogContent ? parseChangelog(changelogContent) : []

  const manifestParsers = [
    parsePackageJson, parseGoMod, parseCargoToml, parsePyproject, parseGemfile,
  ]
  const manifestResults = await Promise.all(manifestParsers.map((p) => p(repoPath)))
  const manifests = manifestResults.filter((m): m is ManifestInfo => m !== null)

  const techStack = extractTechStack(manifests)

  const languages: Record<string, number> = {}
  await walkDirectory(repoPath, languages)

  return { readme, changelog, manifests, techStack, languages }
}
