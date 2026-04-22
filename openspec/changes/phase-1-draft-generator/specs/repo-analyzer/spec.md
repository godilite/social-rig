# Repo Analyzer Spec

## Purpose

Extract structured, grounded facts from a software repository. Every output must trace to a verifiable source (file, commit, API response).

## Inputs

- Local repo path OR remote GitHub URL
- `.social-rig/ignore` exclusion rules
- Optional GitHub token for API access

## Outputs

```yaml
# .social-rig/project-profile.yaml
name: "social-rig"
description: "AI marketing tool for developers"
url: "https://github.com/godilite/social-rig"

languages:
  - TypeScript (68%)
  - Go (32%)

frameworks:
  - Node.js
  - Commander.js
  - Vitest

tech_stack:
  - TypeScript
  - OpenAI API
  - GitHub API

stats:
  stars: 142
  forks: 12
  contributors: 3
  age_days: 45
  commits_last_30d: 87
  open_issues: 5

recent_changes:
  - type: release
    version: "v0.3.0"
    date: "2026-04-20"
    summary: "Added Anthropic provider support"
    source: "git tag v0.3.0"
  - type: feature
    summary: "Terminal review UI with inline editing"
    source: "commit abc1234"

features:
  - claim: "Supports OpenAI, Anthropic, and local models via Ollama"
    source: "README.md, line 34"
    confidence: explicit
  - claim: "Generates platform-specific content variants"
    source: "README.md, line 41"
    confidence: explicit
  - claim: "Source grounding ensures no hallucinated claims"
    source: "README.md, line 52"
    confidence: explicit
```

## Analyzers

### GitAnalyzer
- Reads: `git log`, `git tag`, `git shortlog`
- Extracts: recent commits, releases, contributor count, commit frequency
- Classifies commits by conventional commit prefixes (feat, fix, docs, etc.)

### FileAnalyzer
- Reads: README.md, CHANGELOG.md, package manifests
- Extracts: project description, feature lists, tech stack, dependencies
- Parses markdown sections to identify feature descriptions

### GitHubAnalyzer
- Reads: GitHub REST API (repos, releases, issues)
- Extracts: stars, forks, release notes, trending issues
- Handles: rate limits (exponential backoff), missing auth (graceful degradation)
- Skipped when: no GitHub URL configured or API unavailable

### ProfileAggregator
- Merges all analyzer outputs
- Deduplicates facts
- Assigns confidence levels
- Writes project-profile.yaml for user review
