import type { AIProvider } from "./provider.js"
import { SubprocessProvider } from "./subprocess.js"

export function createCodexCliProvider(): AIProvider {
  return new SubprocessProvider(
    "codex-cli",
    "codex",
    (prompt, system) => ["--quiet", "-p", `${system}\n\n${prompt}`],
  )
}
