import simpleGit, { type LogResult } from "simple-git"
import type { RepoChange } from "../types.js"

export interface GitAnalysis {
  commits: RepoChange[]
  releases: RepoChange[]
  contributors: { name: string; commits: number }[]
  patterns: Record<string, number>
}

const PATTERN_MATCHERS: [string, RegExp][] = [
  ["feature", /^feat[\s(:]/i],
  ["fix", /^fix[\s(:]/i],
  ["docs", /^docs[\s(:]/i],
  ["refactor", /^refactor[\s(:]/i],
  ["chore", /^(chore|build|ci)[\s(:]/i],
]

const KEYWORD_MATCHERS: [string, RegExp][] = [
  ["feature", /\b(add|implement|introduce|support)\b/i],
  ["fix", /\b(fix|resolve|patch|bug|hotfix)\b/i],
  ["docs", /\b(readme|docs|documentation|typo)\b/i],
  ["refactor", /\b(refactor|restructure|reorganize|cleanup|clean up)\b/i],
  ["chore", /\b(update dep|bump|upgrade|ci|build|release)\b/i],
]

function categorizeCommit(message: string): string {
  for (const [category, regex] of PATTERN_MATCHERS) {
    if (regex.test(message)) return category
  }
  for (const [category, regex] of KEYWORD_MATCHERS) {
    if (regex.test(message)) return category
  }
  return "other"
}

export async function analyzeGit(repoPath: string): Promise<GitAnalysis> {
  const git = simpleGit(repoPath)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const since = thirtyDaysAgo.toISOString().split("T")[0]

  let log: LogResult
  try {
    log = await git.log({ "--since": since })
  } catch {
    return { commits: [], releases: [], contributors: [], patterns: {} }
  }

  const commits: RepoChange[] = log.all.map((entry) => ({
    type: "commit" as const,
    title: entry.message.split("\n")[0],
    date: entry.date,
    details: entry.body || undefined,
  }))

  const patterns: Record<string, number> = {}
  for (const commit of commits) {
    const category = categorizeCommit(commit.title)
    patterns[category] = (patterns[category] || 0) + 1
  }

  const contributorMap = new Map<string, number>()
  for (const entry of log.all) {
    const name = entry.author_name
    contributorMap.set(name, (contributorMap.get(name) || 0) + 1)
  }
  const contributors = Array.from(contributorMap.entries())
    .map(([name, count]) => ({ name, commits: count }))
    .sort((a, b) => b.commits - a.commits)

  let releases: RepoChange[] = []
  try {
    const tags = await git.tags()
    const tagList = tags.all.slice(-20)
    const releaseEntries = await Promise.all(
      tagList.map(async (tag) => {
        try {
          const tagLog = await git.log({ "-1": null, [tag]: null } as Record<string, unknown>)
          const entry = tagLog.latest
          if (!entry) return null
          return {
            type: "release" as const,
            title: tag,
            date: entry.date,
          }
        } catch {
          return null
        }
      })
    )
    releases = releaseEntries
      .filter((r): r is RepoChange => r !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } catch {
    // no tags
  }

  return { commits, releases, contributors, patterns }
}
