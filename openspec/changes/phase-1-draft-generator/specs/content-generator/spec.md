# Content Generator Spec

## Purpose

Transform a ProjectProfile into human-quality marketing drafts using copywriting frameworks. Every draft is grounded in repo facts and tailored to target platforms.

## Content Types

| Type | Trigger | Best Framework |
|------|---------|---------------|
| release_announcement | New git tag or GitHub release | AIDA |
| feature_highlight | Notable feature in README/docs | PAS |
| dev_tip | Useful pattern found in codebase | BAB |
| behind_the_scenes | High commit activity, refactors | BAB |
| tutorial_teaser | Good documentation detected | AIDA |
| milestone_celebration | Star/contributor milestones | AIDA |
| comparison | Unique differentiator found | PAS |

## Copywriting Frameworks

### PAS (Problem-Agitate-Solution)
Best for: pain-point posts, feature highlights
```
Problem:  State the pain your audience feels
Agitate:  Make it feel urgent or relatable
Solution: Show how the project solves it
```

### AIDA (Attention-Interest-Desire-Action)
Best for: launches, announcements, milestones
```
Attention: Hook with a bold or surprising statement
Interest:  Explain what makes this noteworthy
Desire:    Show what the reader gets from it
Action:    Clear CTA (try it, star it, read more)
```

### BAB (Before-After-Bridge)
Best for: transformation stories, dev tips
```
Before: How things were (the old/hard way)
After:  How things are now (the easy way)
Bridge: The project/feature that makes the difference
```

## Platform Variants

Each draft produces variants per target platform:

| Platform | Max Length | Format | Notes |
|----------|-----------|--------|-------|
| X/Twitter | 280 chars | Single post or thread | Threads: 5 tweets max |
| LinkedIn | 3000 chars | Professional tone, paragraphs | First line is the hook |
| Dev.to | unlimited | Markdown article | Title, tags, cover image hint |
| Hashnode | unlimited | Markdown article | Similar to Dev.to |
| Bluesky | 300 chars | Casual, similar to X | |
| Reddit | unlimited | Title + body, subreddit-aware | |

## AI Prompt Structure

```
System: You are a senior copywriter who specializes in developer marketing.
You write for {audience}. Your tone is {tone}.

Rules:
- Every feature you mention MUST come from the provided facts
- Never use these phrases: {banned_phrases}
- No emoji walls (max 2 per post)
- CTA must be specific and actionable
- Match the {framework} structure exactly

Project Facts:
{grounded_facts as YAML}

Task:
Generate a {content_type} using the {framework} framework.
Target platform: {platform} (max {max_length} chars).
Angle: {angle}

Output format:
headline: (if applicable)
body: the post content
hashtags: [max 3]
cta: the call to action
source_refs: [which facts you used, by index]
```

## Quality Gates

Before a draft is accepted:

1. **Source check**: every claim maps to a GroundedFact index
2. **Banned phrase check**: none of the configured avoid phrases present
3. **Length check**: within platform char limit
4. **Tone check**: matches configured voice (AI self-evaluation score)
5. **Novelty check**: not too similar to previously generated drafts
