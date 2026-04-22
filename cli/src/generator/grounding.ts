import type { GroundedFact } from "../types.js"

interface GroundingResult {
  valid: boolean
  ungroundedClaims: string[]
}

interface BannedPhraseResult {
  clean: string
  removed: string[]
}

const CLAIM_PATTERNS = [
  /(\d+[+%x]?\s+\w+)/gi,
  /(?:supports?|enables?|provides?|includes?|features?|offers?)\s+(.+?)(?:\.|,|$)/gi,
  /(?:built with|powered by|uses?)\s+(.+?)(?:\.|,|$)/gi,
  /(?:over|more than|up to)\s+(\d[\d,]*\+?\s+\w+)/gi,
]

function extractClaims(body: string): string[] {
  const claims: string[] = []
  for (const pattern of CLAIM_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags)
    let match: RegExpExecArray | null
    while ((match = regex.exec(body)) !== null) {
      const claim = (match[1] ?? match[0]).trim()
      if (claim.length > 3) {
        claims.push(claim)
      }
    }
  }
  return [...new Set(claims)]
}

function claimMatchesFact(claim: string, fact: GroundedFact): boolean {
  const claimLower = claim.toLowerCase()
  const factLower = fact.claim.toLowerCase()
  if (factLower.includes(claimLower) || claimLower.includes(factLower)) {
    return true
  }
  const claimWords = claimLower.split(/\s+/).filter((w) => w.length > 3)
  const factWords = factLower.split(/\s+/).filter((w) => w.length > 3)
  const overlap = claimWords.filter((w) => factWords.includes(w))
  return overlap.length >= Math.max(1, Math.floor(claimWords.length * 0.5))
}

export function validateGrounding(
  body: string,
  facts: GroundedFact[],
): GroundingResult {
  const claims = extractClaims(body)
  if (claims.length === 0) {
    return { valid: true, ungroundedClaims: [] }
  }

  const ungrounded: string[] = []
  for (const claim of claims) {
    const grounded = facts.some((fact) => claimMatchesFact(claim, fact))
    if (!grounded) {
      ungrounded.push(claim)
    }
  }

  return {
    valid: ungrounded.length === 0,
    ungroundedClaims: ungrounded,
  }
}

export function enforceBannedPhrases(
  body: string,
  banned: string[],
): BannedPhraseResult {
  let clean = body
  const removed: string[] = []

  for (const phrase of banned) {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")
    if (regex.test(clean)) {
      removed.push(phrase)
      clean = clean.replace(regex, "").replace(/\s{2,}/g, " ").trim()
    }
  }

  return { clean, removed }
}
