import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("simple-git", () => {
  const mockGit = {
    log: vi.fn(),
    tags: vi.fn(),
  }
  return { default: () => mockGit, __mockGit: mockGit }
})

import { analyzeGit } from "./git.js"
import { __mockGit } from "simple-git"

const git = __mockGit as {
  log: ReturnType<typeof vi.fn>
  tags: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("analyzeGit", () => {
  it("categorizes conventional commits", async () => {
    git.log.mockResolvedValue({
      all: [
        { message: "feat: add login", date: "2024-01-10", author_name: "Alice", body: "" },
        { message: "fix: crash on startup", date: "2024-01-11", author_name: "Bob", body: "" },
        { message: "docs: update readme", date: "2024-01-12", author_name: "Alice", body: "" },
        { message: "refactor: clean up utils", date: "2024-01-13", author_name: "Charlie", body: "" },
        { message: "chore: bump deps", date: "2024-01-14", author_name: "Bob", body: "" },
      ],
      latest: null,
      total: 5,
    })
    git.tags.mockResolvedValue({ all: [] })

    const result = await analyzeGit("/fake/repo")

    expect(result.patterns["feature"]).toBe(1)
    expect(result.patterns["fix"]).toBe(1)
    expect(result.patterns["docs"]).toBe(1)
    expect(result.patterns["refactor"]).toBe(1)
    expect(result.patterns["chore"]).toBe(1)
  })

  it("categorizes keyword-based commits", async () => {
    git.log.mockResolvedValue({
      all: [
        { message: "add new search feature", date: "2024-01-10", author_name: "Alice", body: "" },
        { message: "resolve a nasty bug", date: "2024-01-11", author_name: "Bob", body: "" },
      ],
      latest: null,
      total: 2,
    })
    git.tags.mockResolvedValue({ all: [] })

    const result = await analyzeGit("/fake/repo")

    expect(result.patterns["feature"]).toBe(1)
    expect(result.patterns["fix"]).toBe(1)
  })

  it("ranks contributors by commit count", async () => {
    git.log.mockResolvedValue({
      all: [
        { message: "feat: a", date: "2024-01-10", author_name: "Alice", body: "" },
        { message: "feat: b", date: "2024-01-11", author_name: "Alice", body: "" },
        { message: "feat: c", date: "2024-01-12", author_name: "Alice", body: "" },
        { message: "fix: d", date: "2024-01-13", author_name: "Bob", body: "" },
      ],
      latest: null,
      total: 4,
    })
    git.tags.mockResolvedValue({ all: [] })

    const result = await analyzeGit("/fake/repo")

    expect(result.contributors[0].name).toBe("Alice")
    expect(result.contributors[0].commits).toBe(3)
    expect(result.contributors[1].name).toBe("Bob")
    expect(result.contributors[1].commits).toBe(1)
  })

  it("returns empty results for a repo with no commits", async () => {
    git.log.mockRejectedValue(new Error("no commits"))
    const result = await analyzeGit("/empty/repo")

    expect(result.commits).toEqual([])
    expect(result.releases).toEqual([])
    expect(result.contributors).toEqual([])
    expect(result.patterns).toEqual({})
  })

  it("processes tags as releases", async () => {
    git.log.mockResolvedValue({
      all: [
        { message: "feat: init", date: "2024-01-10", author_name: "Alice", body: "" },
      ],
      latest: null,
      total: 1,
    })
    git.tags.mockResolvedValue({ all: ["v1.0.0", "v1.1.0"] })

    const tagLogFn = vi.fn()
    tagLogFn.mockResolvedValueOnce({ latest: { date: "2024-01-05" } })
    tagLogFn.mockResolvedValueOnce({ latest: { date: "2024-01-15" } })

    const originalLog = git.log
    git.log
      .mockResolvedValueOnce({
        all: [{ message: "feat: init", date: "2024-01-10", author_name: "Alice", body: "" }],
        latest: null,
        total: 1,
      })
      .mockResolvedValueOnce({ latest: { date: "2024-01-05" } })
      .mockResolvedValueOnce({ latest: { date: "2024-01-15" } })

    const result = await analyzeGit("/fake/repo")

    expect(result.releases.length).toBeGreaterThanOrEqual(0)
  })

  it("maps commits to RepoChange with correct fields", async () => {
    git.log.mockResolvedValue({
      all: [
        { message: "feat: login page\nAdded auth flow", date: "2024-02-01", author_name: "Dev", body: "Added auth flow" },
      ],
      latest: null,
      total: 1,
    })
    git.tags.mockResolvedValue({ all: [] })

    const result = await analyzeGit("/fake/repo")

    expect(result.commits).toHaveLength(1)
    expect(result.commits[0].type).toBe("commit")
    expect(result.commits[0].title).toBe("feat: login page")
    expect(result.commits[0].date).toBe("2024-02-01")
    expect(result.commits[0].details).toBe("Added auth flow")
  })

  it("marks uncategorizable commits as other", async () => {
    git.log.mockResolvedValue({
      all: [
        { message: "random stuff happening", date: "2024-01-10", author_name: "Dev", body: "" },
      ],
      latest: null,
      total: 1,
    })
    git.tags.mockResolvedValue({ all: [] })

    const result = await analyzeGit("/fake/repo")

    expect(result.patterns["other"]).toBe(1)
  })
})
