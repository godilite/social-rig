import { describe, it, expect } from "vitest"
import { validateGrounding, enforceBannedPhrases } from "./grounding.js"
import type { GroundedFact } from "../types.js"

describe("validateGrounding", () => {
  it("passes when all claims match facts", () => {
    const facts: GroundedFact[] = [
      { claim: "Supports hot reload", source: "README", confidence: "explicit" },
      { claim: "500 GitHub stars", source: "GitHub API", confidence: "explicit" },
    ]
    const body = "This tool supports hot reload and has 500 GitHub stars."

    const result = validateGrounding(body, facts)

    expect(result.valid).toBe(true)
    expect(result.ungroundedClaims).toHaveLength(0)
  })

  it("detects ungrounded claims", () => {
    const facts: GroundedFact[] = [
      { claim: "Built with TypeScript", source: "repo analysis", confidence: "explicit" },
    ]
    const body = "This project supports 50+ languages and provides enterprise-grade security."

    const result = validateGrounding(body, facts)

    expect(result.valid).toBe(false)
    expect(result.ungroundedClaims.length).toBeGreaterThan(0)
  })

  it("returns valid when body has no extractable claims", () => {
    const body = "This is a simple sentence with no numbers or specific claims."
    const result = validateGrounding(body, [])

    expect(result.valid).toBe(true)
    expect(result.ungroundedClaims).toEqual([])
  })

  it("matches claims with partial word overlap", () => {
    const facts: GroundedFact[] = [
      { claim: "Built with React and TypeScript", source: "package.json", confidence: "explicit" },
    ]
    const body = "This project is built with React for the frontend."

    const result = validateGrounding(body, facts)

    expect(result.valid).toBe(true)
  })
})

describe("enforceBannedPhrases", () => {
  it("removes a single banned phrase", () => {
    const result = enforceBannedPhrases(
      "This is a game-changer for developers.",
      ["game-changer"],
    )

    expect(result.clean).not.toContain("game-changer")
    expect(result.removed).toContain("game-changer")
  })

  it("removes multiple banned phrases", () => {
    const result = enforceBannedPhrases(
      "This revolutionary tool is a game-changer that leverages AI.",
      ["revolutionary", "game-changer", "leverages"],
    )

    expect(result.clean).not.toContain("revolutionary")
    expect(result.clean).not.toContain("game-changer")
    expect(result.clean).not.toContain("leverages")
    expect(result.removed).toHaveLength(3)
  })

  it("returns original text when no banned phrases match", () => {
    const original = "A fast and reliable build tool."
    const result = enforceBannedPhrases(original, ["revolutionary", "game-changer"])

    expect(result.clean).toBe(original)
    expect(result.removed).toEqual([])
  })

  it("is case-insensitive", () => {
    const result = enforceBannedPhrases(
      "This is Revolutionary technology.",
      ["revolutionary"],
    )

    expect(result.clean).not.toContain("Revolutionary")
    expect(result.removed).toContain("revolutionary")
  })

  it("collapses extra whitespace after removal", () => {
    const result = enforceBannedPhrases(
      "This is a    game-changer    tool.",
      ["game-changer"],
    )

    expect(result.clean).not.toContain("  ")
  })
})
