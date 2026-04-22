import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { analyzeFiles } from "./files.js"

const TEST_DIR = join(process.cwd(), ".test-files-analyzer")

function writeFile(relative: string, content: string) {
  writeFileSync(join(TEST_DIR, relative), content, "utf-8")
}

function mkdir(relative: string) {
  mkdirSync(join(TEST_DIR, relative), { recursive: true })
}

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true })
})

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true })
})

describe("analyzeFiles", () => {
  describe("README parsing", () => {
    it("extracts description from first paragraph after heading", async () => {
      writeFile("README.md", [
        "# My Project",
        "A fast CLI tool for developers.",
        "",
        "## Installation",
      ].join("\n"))

      const result = await analyzeFiles(TEST_DIR)

      expect(result.readme.description).toBe("A fast CLI tool for developers.")
    })

    it("extracts section headings", async () => {
      writeFile("README.md", [
        "# My Project",
        "Description here.",
        "## Installation",
        "npm install",
        "## Usage",
        "run it",
        "### Advanced",
        "more stuff",
      ].join("\n"))

      const result = await analyzeFiles(TEST_DIR)

      expect(result.readme.sections).toContain("My Project")
      expect(result.readme.sections).toContain("Installation")
      expect(result.readme.sections).toContain("Usage")
      expect(result.readme.sections).toContain("Advanced")
    })

    it("extracts features from a Features section", async () => {
      writeFile("README.md", [
        "# Tool",
        "A tool.",
        "## Features",
        "- Fast compilation",
        "- Hot reload support",
        "- Zero config",
        "## License",
      ].join("\n"))

      const result = await analyzeFiles(TEST_DIR)

      expect(result.readme.features).toEqual([
        "Fast compilation",
        "Hot reload support",
        "Zero config",
      ])
    })

    it("returns empty readme info when no README exists", async () => {
      const result = await analyzeFiles(TEST_DIR)

      expect(result.readme.description).toBe("")
      expect(result.readme.sections).toEqual([])
      expect(result.readme.features).toEqual([])
    })
  })

  describe("manifest detection", () => {
    it("detects package.json with name and description", async () => {
      writeFile("package.json", JSON.stringify({
        name: "my-tool",
        description: "A CLI tool",
        dependencies: { express: "^4.0.0" },
        devDependencies: { vitest: "^2.0.0" },
      }))

      const result = await analyzeFiles(TEST_DIR)

      expect(result.manifests).toHaveLength(1)
      expect(result.manifests[0].type).toBe("package.json")
      expect(result.manifests[0].name).toBe("my-tool")
      expect(result.manifests[0].description).toBe("A CLI tool")
      expect(result.manifests[0].dependencies).toContain("express")
      expect(result.manifests[0].devDependencies).toContain("vitest")
    })

    it("returns empty manifests when no manifest files exist", async () => {
      const result = await analyzeFiles(TEST_DIR)
      expect(result.manifests).toEqual([])
    })
  })

  describe("tech stack detection", () => {
    it("detects known frameworks from dependencies", async () => {
      writeFile("package.json", JSON.stringify({
        name: "web-app",
        dependencies: { react: "^18.0.0", express: "^4.0.0", hono: "^4.0.0" },
        devDependencies: { tailwindcss: "^3.0.0" },
      }))

      const result = await analyzeFiles(TEST_DIR)

      expect(result.techStack).toContain("React")
      expect(result.techStack).toContain("Express")
      expect(result.techStack).toContain("Hono")
      expect(result.techStack).toContain("Tailwind CSS")
    })

    it("returns empty tech stack with no known deps", async () => {
      writeFile("package.json", JSON.stringify({
        name: "plain",
        dependencies: { "my-obscure-lib": "^1.0.0" },
      }))

      const result = await analyzeFiles(TEST_DIR)

      expect(result.techStack).toEqual([])
    })
  })

  describe("language breakdown", () => {
    it("counts files by language extension", async () => {
      mkdir("src")
      writeFile("src/index.ts", "export default 1")
      writeFile("src/utils.ts", "export const x = 2")
      writeFile("src/app.js", "module.exports = {}")
      writeFile("src/style.css", "body {}")

      const result = await analyzeFiles(TEST_DIR)

      expect(result.languages["TypeScript"]).toBe(2)
      expect(result.languages["JavaScript"]).toBe(1)
      expect(result.languages["CSS"]).toBe(1)
    })

    it("skips node_modules and .git directories", async () => {
      mkdir("node_modules/pkg")
      writeFile("node_modules/pkg/index.js", "nope")
      mkdir(".git/objects")
      writeFile(".git/objects/test.js", "nope")
      writeFile("real.ts", "yes")

      const result = await analyzeFiles(TEST_DIR)

      expect(result.languages["TypeScript"]).toBe(1)
      expect(result.languages["JavaScript"]).toBeUndefined()
    })
  })

  describe("changelog", () => {
    it("extracts changelog headings", async () => {
      writeFile("CHANGELOG.md", [
        "# Changelog",
        "## v1.2.0",
        "- Added feature X",
        "## v1.1.0",
        "- Fixed bug Y",
      ].join("\n"))

      const result = await analyzeFiles(TEST_DIR)

      expect(result.changelog).toContain("Changelog")
      expect(result.changelog).toContain("v1.2.0")
      expect(result.changelog).toContain("v1.1.0")
    })

    it("returns empty changelog when no file exists", async () => {
      const result = await analyzeFiles(TEST_DIR)
      expect(result.changelog).toEqual([])
    })
  })
})
