# Terminal Review Workflow Spec

## Purpose

Interactive terminal UI for reviewing, editing, and approving generated drafts. The review gate is mandatory. No content bypasses human review.

## Flow

```
$ npx social-rig review

  Draft 1/5 - Feature Highlight (PAS Framework)
  Platform: X/Twitter (234/280 chars)

  ┌─────────────────────────────────────────────────┐
  │ Most devs write marketing copy from scratch.     │
  │ Every. Single. Time.                             │
  │                                                  │
  │ social-rig reads your repo and writes it for you.│
  │ Grounded in real features, not AI hallucinations.│
  │                                                  │
  │ npx social-rig generate                          │
  │ #devtools #marketing                             │
  └─────────────────────────────────────────────────┘

  Sources:
    [1] README.md, line 12: "Analyzes repos and generates content"
    [2] README.md, line 18: "Source grounding ensures accuracy"

  [a]pprove  [e]dit  [r]eject  [g]enerate new  [s]kip  [q]uit
```

## Actions

| Key | Action | Behavior |
|-----|--------|----------|
| a | Approve | Mark draft as approved, move to next |
| e | Edit | Open draft in $EDITOR, save updates |
| r | Reject | Mark as rejected with optional reason |
| g | Regenerate | Send to AI with optional feedback prompt |
| s | Skip | Leave as pending, move to next |
| q | Quit | Save state and exit review |

## Multi-Platform Review

When a draft has multiple platform variants, show them sequentially:

```
  Draft 1/5 - Feature Highlight
  Variant 1/2: X/Twitter (234/280 chars)
  ...
  Variant 2/2: LinkedIn (890/3000 chars)
  ...

  Approve all variants? [a]ll / review [i]ndividually
```

## State Persistence

Drafts are stored at `.social-rig/drafts/`:

```
.social-rig/
  drafts/
    2026-04-22/
      draft-001.yaml     # includes content, status, source refs
      draft-002.yaml
      ...
    latest.yaml          # symlink or index to most recent batch
```

Each draft file:

```yaml
id: "draft-001"
generated_at: "2026-04-22T14:30:00Z"
content_type: "feature_highlight"
framework: "PAS"
status: "approved"           # pending | approved | rejected
reviewed_at: "2026-04-22T15:00:00Z"
variants:
  - platform: "x"
    body: "Most devs write marketing copy from scratch..."
    hashtags: ["devtools", "marketing"]
    char_count: 234
  - platform: "linkedin"
    body: "I used to spend 30 minutes writing a single post..."
    char_count: 890
source_facts:
  - index: 1
    claim: "Analyzes repos and generates content"
    source: "README.md, line 12"
  - index: 2
    claim: "Source grounding ensures accuracy"
    source: "README.md, line 18"
```

## Summary on Exit

```
  Review complete:
    5 drafts reviewed
    3 approved
    1 rejected (reason: "too generic")
    1 skipped

  Run `npx social-rig export` to save approved drafts.
```
