import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import chalk from "chalk"
import ora from "ora"
import YAML from "yaml"
import { analyzeGit } from "./git.js"
import { analyzeFiles } from "./files.js"
import { analyzeGitHub } from "./github.js"
import type { GroundedFact, ProjectProfile, RepoChange, RepoStats } from "../types.js"

async function extractGitHubUrl(repoPath: string): Promise<string | null> {
  try {
    const gitConfig = join(repoPath, ".git", "config")
    const content = await readFile(gitConfig, "utf-8")
    const match = content.match(/url\s*=\s*(.+github\.com.+)/m)
    return match ? match[1].trim() : null
  } catch {
    return null
  }
}

function computeAge(commits: RepoChange[]): string {
  if (commits.length === 0) return "unknown"
  const dates = commits.map((c) => new Date(c.date).getTime()).filter((d) => !isNaN(d))
  if (dates.length === 0) return "unknown"
  const oldest = Math.min(...dates)
  const days = Math.floor((Date.now() - oldest) / (1000 * 60 * 60 * 24))
  if (days < 30) return `${days} days`
  if (days < 365) return `${Math.floor(days / 30)} months`
  return `${Math.floor(days / 365)} years`
}

export async function buildProfile(repoPath: string): Promise<ProjectProfile> {
  const [gitResult, fileResult] = await Promise.all([
    analyzeGit(repoPath),
    analyzeFiles(repoPath),
  ])

  const githubUrl = await extractGitHubUrl(repoPath)
  const githubResult = githubUrl ? await analyzeGitHub(githubUrl) : null

  const name =
    fileResult.manifests[0]?.name ||
    fileResult.readme.sections[0] ||
    repoPath.split("/").pop() ||
    "unknown"

  const description =
    fileResult.manifests[0]?.description ||
    fileResult.readme.description ||
    ""

  const languages = Object.entries(fileResult.languages)
    .sort(([, a], [, b]) => b - a)
    .map(([lang]) => lang)

  const features: GroundedFact[] = []

  for (const feature of fileResult.readme.features) {
    features.push({
      claim: feature,
      source: "README.md",
      confidence: "explicit",
    })
  }

  const patternFacts: [string, string][] = [
    ["feature", "Active feature development"],
    ["fix", "Active bug fixing and maintenance"],
    ["docs", "Documentation is actively maintained"],
    ["refactor", "Codebase is actively improved and refactored"],
  ]
  for (const [pattern, claim] of patternFacts) {
    if ((gitResult.patterns[pattern] || 0) >= 3) {
      features.push({
        claim,
        source: `${gitResult.patterns[pattern]} ${pattern} commits in last 30 days`,
        confidence: "inferred",
      })
    }
  }

  const recentChanges: RepoChange[] = [
    ...gitResult.commits.slice(0, 10),
    ...gitResult.releases.slice(0, 5),
    ...(githubResult?.releases || []),
  ]

  const stats: RepoStats = {
    stars: githubResult?.stars,
    forks: githubResult?.forks,
    watchers: githubResult?.watchers,
    contributors: gitResult.contributors.length,
    age: computeAge(gitResult.commits),
    languages: fileResult.languages,
    topics: githubResult?.topics || [],
  }

  const frameworks = fileResult.techStack
  const techStack = [...new Set([...fileResult.techStack, ...languages.slice(0, 5)])]

  const profile: ProjectProfile = {
    name,
    description,
    languages,
    frameworks,
    recentChanges,
    features,
    stats,
    techStack,
  }

  const outDir = join(repoPath, ".social-rig")
  await mkdir(outDir, { recursive: true })
  await writeFile(
    join(outDir, "project-profile.yaml"),
    YAML.stringify(profile),
    "utf-8"
  )

  return profile
}

export async function runProfile(options: { project?: string; regenerate?: boolean }) {
  const repoPath = process.cwd()
  const profilePath = join(repoPath, ".social-rig", "project-profile.yaml")

  if (!options.regenerate) {
    try {
      const existing = await readFile(profilePath, "utf-8")
      const profile = YAML.parse(existing) as ProjectProfile
      printProfile(profile)
      return
    } catch {
      // fall through to generation
    }
  }

  const spinner = ora("Analyzing repository...").start()
  try {
    const profile = await buildProfile(repoPath)
    spinner.succeed("Profile generated")
    printProfile(profile)
  } catch (err) {
    spinner.fail("Failed to analyze repository")
    console.error(chalk.red(err instanceof Error ? err.message : String(err)))
  }
}

function printProfile(profile: ProjectProfile) {
  console.log()
  console.log(chalk.bold.cyan(`  ${profile.name}`))
  if (profile.description) {
    console.log(chalk.dim(`  ${profile.description}`))
  }
  console.log()

  if (profile.languages.length > 0) {
    console.log(chalk.bold("  Languages: ") + profile.languages.join(", "))
  }
  if (profile.techStack.length > 0) {
    console.log(chalk.bold("  Tech Stack: ") + profile.techStack.join(", "))
  }
  if (profile.stats.contributors > 0) {
    console.log(chalk.bold("  Contributors: ") + profile.stats.contributors)
  }
  if (profile.stats.stars !== undefined) {
    console.log(chalk.bold("  Stars: ") + profile.stats.stars)
  }
  if (profile.stats.age !== "unknown") {
    console.log(chalk.bold("  Age: ") + profile.stats.age)
  }

  if (profile.features.length > 0) {
    console.log()
    console.log(chalk.bold("  Features:"))
    for (const f of profile.features.slice(0, 10)) {
      const badge = f.confidence === "explicit" ? chalk.green("explicit") : chalk.yellow("inferred")
      console.log(`    ${chalk.dim("-")} ${f.claim} ${chalk.dim(`[${badge}]`)}`)
    }
  }

  if (profile.recentChanges.length > 0) {
    console.log()
    console.log(chalk.bold("  Recent Changes:"))
    for (const c of profile.recentChanges.slice(0, 5)) {
      console.log(`    ${chalk.dim("-")} ${c.title} ${chalk.dim(`(${c.date})`)}`)
    }
  }
  console.log()
}
