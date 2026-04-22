import type { AIProvider } from "./provider.js"
import { SubprocessProvider } from "./subprocess.js"

export function createGeminiCliProvider(): AIProvider {
  return new SubprocessProvider(
    "gemini-cli",
    "gemini",
    (prompt, system) => ["-p", `${system}\n\n${prompt}`],
  )
}
