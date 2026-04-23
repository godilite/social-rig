import { Command } from "commander"
import chalk from "chalk"
import ora from "ora"
import { resolve } from "node:path"
import { getDraft, updateDraftImagePath } from "../db/drafts.js"
import { attachImageFile, attachImageUrl, removeImage } from "../generator/images.js"
import { logActivity } from "../db/activity.js"

export const imageCommand = new Command("image")
  .description("Manage images on drafts")

imageCommand
  .command("add <draftId> <source>")
  .description("Add an image to a draft (local file path or URL)")
  .action(async (draftId: string, source: string) => {
    const spinner = ora("Processing image...").start()

    try {
      const draft = getDraft(draftId)
      if (!draft) {
        spinner.fail(`Draft not found: ${draftId}`)
        return
      }

      if (draft.image_path) {
        removeImage(draft.image_path)
      }

      let imagePath: string
      const isUrl = source.startsWith("http://") || source.startsWith("https://")

      if (isUrl) {
        spinner.text = "Downloading image..."
        imagePath = await attachImageUrl(draftId, source)
      } else {
        const resolvedPath = resolve(source)
        imagePath = attachImageFile(draftId, resolvedPath)
      }

      updateDraftImagePath(draftId, imagePath)
      logActivity(draft.project_id, "image_added", { draftId, source: isUrl ? "url" : "file" })

      spinner.succeed(`Image added to draft ${chalk.dim(draftId)}`)
      console.log(chalk.dim(`  ${imagePath}`))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      spinner.fail(message)
      process.exitCode = 1
    }
  })

imageCommand
  .command("remove <draftId>")
  .description("Remove image from a draft")
  .action(async (draftId: string) => {
    try {
      const draft = getDraft(draftId)
      if (!draft) {
        console.log(chalk.red(`  Draft not found: ${draftId}`))
        return
      }

      if (!draft.image_path) {
        console.log(chalk.yellow(`  Draft ${draftId} has no image.`))
        return
      }

      removeImage(draft.image_path)
      updateDraftImagePath(draftId, null)
      logActivity(draft.project_id, "image_removed", { draftId })

      console.log(chalk.green(`  Image removed from draft ${chalk.dim(draftId)}`))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.log(chalk.red(`  ${message}`))
      process.exitCode = 1
    }
  })
