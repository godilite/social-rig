import chalk from "chalk"
import ora from "ora"
import { loadConfig } from "../config/loader.js"
import { createProvider } from "../ai/provider.js"
import { buildContentPlan } from "./strategy.js"
import { generateDrafts } from "./drafts.js"
import { createDraft, createDraftVariant } from "../db/drafts.js"
import { getProjectByName } from "../db/projects.js"
import { logActivity } from "../db/activity.js"
import { CONTENT_TYPE_LABELS, FRAMEWORK_LABELS } from "../config/schema.js"
import type { ProjectProfile } from "../types.js"

export async function runGenerate(options: { count: string; project?: string; all?: boolean; provider?: string; model?: string }) {
  const spinner = ora("Loading configuration...").start()

  try {
    const config = loadConfig(process.cwd())

    if (!config.project.name) {
      spinner.fail("No project configured. Run 'social-rig init' first.")
      return
    }

    const batchSize = parseInt(options.count, 10) || config.content.batchSize

    spinner.text = "Looking up project profile..."
    const projectRow = getProjectByName(config.project.name)
    if (!projectRow) {
      spinner.fail(
        `Project "${config.project.name}" not found in database. Run 'social-rig init' first.`,
      )
      return
    }

    let profile: ProjectProfile
    if (projectRow.profile_json) {
      profile = JSON.parse(projectRow.profile_json) as ProjectProfile
    } else {
      spinner.fail("No project profile found. Run 'social-rig profile' first.")
      return
    }

    spinner.text = "Building content plan..."
    const plan = buildContentPlan(profile, {
      types: config.content.types,
      platforms: config.content.platforms,
      batchSize,
    })

    if (plan.items.length === 0) {
      spinner.warn("No content items planned. Check your content type configuration.")
      return
    }

    spinner.text = `Planned ${plan.items.length} content items. Connecting to AI provider...`
    const aiConfig = {
      ...config.ai,
      ...(options.provider && { provider: options.provider }),
      ...(options.model && { model: options.model }),
    }
    const provider = await createProvider(aiConfig)

    spinner.text = `Generating ${plan.items.length} drafts with ${provider.name}...`
    const drafts = await generateDrafts(plan, profile, provider, config.voice)

    spinner.text = "Saving drafts to database..."
    for (const draft of drafts) {
      createDraft({
        id: draft.id,
        projectId: projectRow.id,
        contentType: draft.contentType,
        framework: draft.framework,
        sourceFacts: draft.sourceFacts,
        imagePath: draft.imagePath,
      })

      for (const variant of draft.content) {
        createDraftVariant({
          draftId: draft.id,
          platform: variant.platform,
          headline: variant.headline,
          body: variant.body,
          hashtags: variant.hashtags,
          cta: variant.cta,
          charCount: variant.charCount,
        })
      }
    }

    logActivity(projectRow.id, "generate", {
      count: drafts.length,
      types: drafts.map((d) => d.contentType),
      provider: provider.name,
    })

    spinner.succeed(`Generated ${drafts.length} drafts`)

    console.log("")
    for (const draft of drafts) {
      const typeLabel = CONTENT_TYPE_LABELS[draft.contentType]
      const frameworkLabel = FRAMEWORK_LABELS[draft.framework]
      const platforms = draft.content.map((v) => v.platform).join(", ")
      console.log(
        `  ${chalk.green("✓")} ${chalk.bold(typeLabel)} (${frameworkLabel}) → ${platforms}  ${chalk.dim(draft.id)}`,
      )
    }
    console.log("")
    console.log(chalk.dim(`  Run 'social-rig review' to review and approve drafts.`))
    console.log("")
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    spinner.fail(`Generation failed: ${message}`)
    process.exitCode = 1
  }
}
