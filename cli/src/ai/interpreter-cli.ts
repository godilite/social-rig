import type { AIProvider } from "./provider.js"
import { SubprocessProvider } from "./subprocess.js"

export function createInterpreterCliProvider(): AIProvider {
  return new SubprocessProvider(
    "interpreter-cli",
    "interpreter",
    (prompt, system) => ["-e", `${system}\n\n${prompt}`],
  )
}
