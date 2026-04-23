import chalk from "chalk"
import ora from "ora"
import inquirer from "inquirer"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { resolve, basename } from "node:path"
import type { ProjectConfig, Platform, DetectedProvider, ContentType } from "../types.js"
import { TONE_OPTIONS } from "./schema.js"
import { saveConfig, configExists, DEFAULT_CONFIG } from "./loader.js"
import { detectProviders } from "../ai/detect.js"
import { printCompactBanner } from "../ui/banner.js"
import { createProject, getProjectByName, updateProjectProfile } from "../db/projects.js"
import { buildProfile } from "../analyzer/profile.js"

interface RepoManifest {
  name: string
  description: string
  language: string
  projectType: string
}

function detectManifest(repoPath: string): RepoManifest {
  const manifest: RepoManifest = {
    name: basename(resolve(repoPath)),
    description: "",
    language: "unknown",
    projectType: "unknown",
  }

  const packageJsonPath = resolve(repoPath, "package.json")
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"))
      manifest.name = pkg.name ?? manifest.name
      manifest.description = pkg.description ?? ""
      manifest.language = "typescript"
      manifest.projectType = "node"
    } catch {
      manifest.language = "javascript"
      manifest.projectType = "node"
    }
    return manifest
  }

  const goModPath = resolve(repoPath, "go.mod")
  if (existsSync(goModPath)) {
    try {
      const content = readFileSync(goModPath, "utf-8")
      const moduleLine = content.split("\n").find((l) => l.startsWith("module "))
      if (moduleLine) {
        const parts = moduleLine.replace("module ", "").trim().split("/")
        manifest.name = parts[parts.length - 1] ?? manifest.name
      }
    } catch {}
    manifest.language = "go"
    manifest.projectType = "go"
    return manifest
  }

  const cargoPath = resolve(repoPath, "Cargo.toml")
  if (existsSync(cargoPath)) {
    try {
      const content = readFileSync(cargoPath, "utf-8")
      const nameMatch = content.match(/^name\s*=\s*"(.+)"/m)
      const descMatch = content.match(/^description\s*=\s*"(.+)"/m)
      if (nameMatch) manifest.name = nameMatch[1]!
      if (descMatch) manifest.description = descMatch[1]!
    } catch {}
    manifest.language = "rust"
    manifest.projectType = "rust"
    return manifest
  }

  const pyprojectPath = resolve(repoPath, "pyproject.toml")
  if (existsSync(pyprojectPath)) {
    try {
      const content = readFileSync(pyprojectPath, "utf-8")
      const nameMatch = content.match(/^name\s*=\s*"(.+)"/m)
      const descMatch = content.match(/^description\s*=\s*"(.+)"/m)
      if (nameMatch) manifest.name = nameMatch[1]!
      if (descMatch) manifest.description = descMatch[1]!
    } catch {}
    manifest.language = "python"
    manifest.projectType = "python"
    return manifest
  }

  const gemfilePath = resolve(repoPath, "Gemfile")
  if (existsSync(gemfilePath)) {
    manifest.language = "ruby"
    manifest.projectType = "ruby"
    return manifest
  }

  return manifest
}

function formatProviderChoice(p: DetectedProvider): string {
  const badge = p.isLocal ? chalk.cyan("[local]") : chalk.green("[cloud]")
  const model = p.model ? chalk.dim(` (${p.model})`) : ""
  return `${p.name} ${badge}${model}`
}

function buildProviderChoices(providers: DetectedProvider[]) {
  const choices = providers.map((p) => ({
    name: formatProviderChoice(p),
    value: p.name,
  }))
  choices.push({ name: chalk.dim("Enter manually..."), value: "__manual__" })
  return choices
}

function buildDefaultConfig(
  manifest: RepoManifest,
  answers: {
    projectName: string
    audience: string
    tone: string
    provider: string
    providerModel: string
    providerSource: string
    platforms: Platform[]
    imageGen: boolean
    imageProvider: string
    contentTypes: ContentType[]
  },
): ProjectConfig {
  return {
    ...DEFAULT_CONFIG,
    project: {
      name: answers.projectName,
      repo: ".",
      description: manifest.description,
    },
    voice: {
      tone: answers.tone,
      audience: answers.audience,
      avoid: DEFAULT_CONFIG.voice.avoid,
    },
    ai: {
      provider: answers.provider,
      model: answers.providerModel,
      apiKeySource: answers.providerSource,
    },
    images: {
      ...DEFAULT_CONFIG.images,
      enabled: answers.imageGen,
      provider: answers.imageProvider,
    },
    content: {
      ...DEFAULT_CONFIG.content,
      types: answers.contentTypes,
      platforms: answers.platforms,
    },
    connectors: {
      builtin: answers.platforms.filter((p) =>
        ["x", "linkedin", "devto", "hashnode"].includes(p),
      ),
      community: [],
    },
  }
}

const IGNORE_DEFAULTS = `node_modules
.git
dist
build
.next
.nuxt
out
coverage
.nyc_output
.env
.env.*
*.log
.DS_Store
__pycache__
*.pyc
target
vendor
.social-rig/drafts
`

export async function runInit(repo: string, options: { name?: string }) {
  const repoPath = resolve(repo)

  printCompactBanner()
  console.log(
    chalk.bold(`  ${chalk.hex("#6366f1")("◆")} Setting up your project...\n`),
  )

  if (configExists(repoPath)) {
    const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
      {
        type: "confirm",
        name: "overwrite",
        message: chalk.yellow(
          "A .social-rig/ config already exists. Overwrite?",
        ),
        default: false,
      },
    ])
    if (!overwrite) {
      console.log(chalk.dim("\n  Cancelled.\n"))
      return
    }
  }

  const spinner = ora({ text: "Detecting AI providers...", indent: 2 }).start()
  const providers = await detectProviders()
  spinner.succeed(
    providers.length > 0
      ? `Found ${providers.length} AI provider${providers.length > 1 ? "s" : ""}`
      : "No AI providers auto-detected",
  )

  const analyzeSpinner = ora({
    text: "Analyzing repository...",
    indent: 2,
  }).start()
  const manifest = detectManifest(repoPath)
  analyzeSpinner.succeed(
    `Detected ${manifest.projectType} project${manifest.language !== "unknown" ? ` (${manifest.language})` : ""}`,
  )

  console.log()

  const { projectName } = await inquirer.prompt<{ projectName: string }>([
    {
      type: "input",
      name: "projectName",
      message: "Project name:",
      default: options.name ?? manifest.name,
    },
  ])

  const { audience } = await inquirer.prompt<{ audience: string }>([
    {
      type: "input",
      name: "audience",
      message: "Target audience:",
      default: "developers",
    },
  ])

  const { tone } = await inquirer.prompt<{ tone: string }>([
    {
      type: "list",
      name: "tone",
      message: "Tone:",
      choices: TONE_OPTIONS.map((t) => ({ name: t, value: t })),
      default: "witty-technical",
    },
  ])

  let provider = "openai"
  let providerModel = "gpt-4o"
  let providerSource = ""

  if (providers.length > 0) {
    const { selectedProvider } = await inquirer.prompt<{
      selectedProvider: string
    }>([
      {
        type: "list",
        name: "selectedProvider",
        message: "AI provider:",
        choices: buildProviderChoices(providers),
      },
    ])

    if (selectedProvider === "__manual__") {
      const { manualProvider } = await inquirer.prompt<{
        manualProvider: string
      }>([
        {
          type: "input",
          name: "manualProvider",
          message: "Provider name:",
        },
      ])
      provider = manualProvider
      providerSource = "manual"
    } else {
      const match = providers.find((p) => p.name === selectedProvider)
      provider = selectedProvider
      providerModel = match?.model ?? "gpt-4o"
      providerSource = match?.source ?? ""
    }
  } else {
    const { manualProvider } = await inquirer.prompt<{
      manualProvider: string
    }>([
      {
        type: "input",
        name: "manualProvider",
        message: "AI provider (no providers detected):",
        default: "openai",
      },
    ])
    provider = manualProvider
    providerSource = "manual"
  }

  const { platforms } = await inquirer.prompt<{ platforms: Platform[] }>([
    {
      type: "checkbox",
      name: "platforms",
      message: "Platforms:",
      choices: [
        { name: "X (Twitter)", value: "x", checked: true },
        { name: "LinkedIn", value: "linkedin", checked: true },
        { name: "Dev.to", value: "devto" },
        { name: "Hashnode", value: "hashnode" },
      ],
      validate: (input: Platform[]) =>
        input.length > 0 || "Select at least one platform",
    },
  ])

  const { contentTypes } = await inquirer.prompt<{
    contentTypes: ContentType[]
  }>([
    {
      type: "checkbox",
      name: "contentTypes",
      message: "Content types:",
      choices: [
        {
          name: "Feature Highlight",
          value: "feature_highlight",
          checked: true,
        },
        {
          name: "Release Announcement",
          value: "release_announcement",
          checked: true,
        },
        { name: "Dev Tip", value: "dev_tip", checked: true },
        { name: "Behind the Scenes", value: "behind_the_scenes" },
        { name: "Tutorial Teaser", value: "tutorial_teaser" },
        { name: "Milestone Celebration", value: "milestone_celebration" },
      ],
      validate: (input: ContentType[]) =>
        input.length > 0 || "Select at least one content type",
    },
  ])

  const { imageGen } = await inquirer.prompt<{ imageGen: boolean }>([
    {
      type: "confirm",
      name: "imageGen",
      message: "Enable image generation?",
      default: false,
    },
  ])

  let imageProvider = "openai"
  if (imageGen) {
    const { imgProvider } = await inquirer.prompt<{ imgProvider: string }>([
      {
        type: "list",
        name: "imgProvider",
        message: "Image provider:",
        choices: [
          { name: "OpenAI DALL-E 3 (requires OPENAI_API_KEY)", value: "openai" },
          { name: "Stability AI SD3 (requires STABILITY_API_KEY)", value: "stability" },
          { name: "Local Stable Diffusion (Automatic1111 on localhost:7860)", value: "local" },
        ],
      },
    ])
    imageProvider = imgProvider
  }

  const config = buildDefaultConfig(manifest, {
    projectName,
    audience,
    tone,
    provider,
    providerModel,
    providerSource,
    platforms,
    imageGen,
    imageProvider,
    contentTypes,
  })

  const writeSpinner = ora({
    text: "Writing configuration...",
    indent: 2,
  }).start()

  const socialRigDir = resolve(repoPath, ".social-rig")
  if (!existsSync(socialRigDir)) {
    mkdirSync(socialRigDir, { recursive: true })
  }

  saveConfig(repoPath, config)

  const ignorePath = resolve(socialRigDir, "ignore")
  writeFileSync(ignorePath, IGNORE_DEFAULTS, "utf-8")

  writeSpinner.succeed("Configuration saved")

  const dbSpinner = ora({
    text: "Registering project...",
    indent: 2,
  }).start()

  const existing = getProjectByName(projectName)
  let projectId: string
  if (existing) {
    projectId = existing.id
    dbSpinner.succeed("Project already registered")
  } else {
    const row = createProject({
      name: projectName,
      repo: repoPath,
      description: manifest.description,
      configPath: resolve(repoPath, ".social-rig", "config.yaml"),
    })
    projectId = row.id
    dbSpinner.succeed("Project registered")
  }

  const profileSpinner = ora({
    text: "Building project profile...",
    indent: 2,
  }).start()

  try {
    const profile = await buildProfile(repoPath)
    updateProjectProfile(projectId, JSON.stringify(profile))
    profileSpinner.succeed("Project profile built")
  } catch {
    profileSpinner.warn("Could not build full profile (generate will still work with basics)")
  }

  console.log(
    chalk.bold(
      `\n  ${chalk.green("✔")} Project ${chalk.hex("#6366f1")(projectName)} initialized\n`,
    ),
  )
  console.log(chalk.dim("  Created:"))
  console.log(chalk.dim("    .social-rig/config.yaml"))
  console.log(chalk.dim("    .social-rig/ignore"))
  console.log()
  console.log(chalk.bold("  Next steps:"))
  console.log(
    `    ${chalk.cyan("social-rig generate")}  Generate content from your repo`,
  )
  console.log(
    `    ${chalk.cyan("social-rig review")}    Review and approve drafts`,
  )
  console.log(
    `    ${chalk.cyan("social-rig export")}    Export approved content`,
  )
  console.log()
}
