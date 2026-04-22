import type { RepoChange } from "../types.js"

export interface GitHubIssue {
  title: string
  state: string
  labels: string[]
}

export interface GitHubAnalysis {
  stars: number
  forks: number
  watchers: number
  topics: string[]
  releases: RepoChange[]
  issues: GitHubIssue[]
}

function parseGitHubRepo(repoUrl: string): { owner: string; repo: string } | null {
  const httpsMatch = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/)
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] }
  return null
}

async function githubFetch(
  path: string,
  token?: string
): Promise<{ data: unknown; rateLimitRemaining: number } | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "social-rig-cli",
  }
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`https://api.github.com${path}`, { headers })
  } catch {
    return null
  }

  const rateLimitRemaining = parseInt(
    response.headers.get("x-ratelimit-remaining") || "60",
    10
  )

  if (!response.ok) return null
  if (rateLimitRemaining <= 1) return null

  const data = await response.json()
  return { data, rateLimitRemaining }
}

export async function analyzeGitHub(repoUrl: string): Promise<GitHubAnalysis | null> {
  const parsed = parseGitHubRepo(repoUrl)
  if (!parsed) return null

  const { owner, repo } = parsed
  const token = process.env.GITHUB_TOKEN

  const repoResult = await githubFetch(`/repos/${owner}/${repo}`, token)
  if (!repoResult) return null

  const repoData = repoResult.data as {
    stargazers_count: number
    forks_count: number
    watchers_count: number
    topics?: string[]
  }

  const [releasesResult, issuesResult] = await Promise.all([
    githubFetch(`/repos/${owner}/${repo}/releases?per_page=5`, token),
    githubFetch(`/repos/${owner}/${repo}/issues?per_page=20&state=all&sort=updated`, token),
  ])

  const releases: RepoChange[] = []
  if (releasesResult) {
    const releaseData = releasesResult.data as Array<{
      tag_name: string
      name: string
      published_at: string
      html_url: string
      body?: string
    }>
    for (const r of releaseData) {
      releases.push({
        type: "release",
        title: r.name || r.tag_name,
        date: r.published_at,
        url: r.html_url,
        details: r.body?.slice(0, 500),
      })
    }
  }

  const issues: GitHubIssue[] = []
  if (issuesResult) {
    const issueData = issuesResult.data as Array<{
      title: string
      state: string
      labels: Array<{ name: string }>
      pull_request?: unknown
    }>
    for (const i of issueData) {
      issues.push({
        title: i.title,
        state: i.state,
        labels: i.labels.map((l) => l.name),
      })
    }
  }

  return {
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    watchers: repoData.watchers_count,
    topics: repoData.topics || [],
    releases,
    issues,
  }
}
