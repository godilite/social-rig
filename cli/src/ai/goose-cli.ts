import type { AIProvider } from "./provider.js"
import { SubprocessProvider } from "./subprocess.js"

export function createGooseCliProvider(): AIProvider {
  return new SubprocessProvider(
    "goose-cli",
    "goose",
    (prompt, system) => ["run", "-t", `${system}\n\n${prompt}`],
  )
}
