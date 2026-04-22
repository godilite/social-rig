import { execFile } from "node:child_process"
import { promisify } from "node:util"
import type { AIProvider } from "./provider.js"

const execFileAsync = promisify(execFile)

export async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execFileAsync("which", [cmd])
    return true
  } catch {
    return false
  }
}

export class SubprocessProvider implements AIProvider {
  name: string
  private command: string
  private argsBuilder: (prompt: string, systemPrompt: string) => string[]
  private outputParser?: (raw: string) => string

  constructor(
    name: string,
    command: string,
    argsBuilder: (prompt: string, systemPrompt: string) => string[],
    outputParser?: (raw: string) => string,
  ) {
    this.name = name
    this.command = command
    this.argsBuilder = argsBuilder
    this.outputParser = outputParser
  }

  async generate(prompt: string, systemPrompt: string): Promise<string> {
    const args = this.argsBuilder(prompt, systemPrompt)

    let result: { stdout: string; stderr: string }
    try {
      result = await execFileAsync(this.command, args, {
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
      })
    } catch (error) {
      const execError = error as { stderr?: string; message?: string }
      const stderr = execError.stderr || execError.message || "Unknown error"
      throw new Error(`${this.name} failed: ${stderr}`)
    }

    const output = result.stdout.trim()

    if (this.outputParser) {
      return this.outputParser(output)
    }

    return output
  }
}
