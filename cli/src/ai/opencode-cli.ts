import type { AIProvider } from "./provider.js"
import { SubprocessProvider } from "./subprocess.js"

export function createOpencodeCliProvider(): AIProvider {
  return new SubprocessProvider(
    "opencode-cli",
    "opencode",
    (prompt, system) => ["chat", "--non-interactive", "-m", `${system}\n\n${prompt}`],
  )
}
