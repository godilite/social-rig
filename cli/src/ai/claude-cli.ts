import type { AIProvider } from "./provider.js"
import { SubprocessProvider } from "./subprocess.js"

export function createClaudeCliProvider(): AIProvider {
  return new SubprocessProvider(
    "claude-cli",
    "claude",
    (prompt, system) => ["--print", "-p", `${system}\n\n${prompt}`],
  )
}
