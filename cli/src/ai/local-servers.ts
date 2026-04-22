interface LocalServer {
  name: string
  baseUrl: string
  models: string[]
}

interface ServerConfig {
  name: string
  port: number
  modelsEndpoint: string
  modelsParser: (data: Record<string, unknown>) => string[]
}

const KNOWN_SERVERS: ServerConfig[] = [
  {
    name: "ollama",
    port: 11434,
    modelsEndpoint: "/api/tags",
    modelsParser: (data) => {
      const models = data.models as { name: string }[] | undefined
      return models?.map((m) => m.name) ?? []
    },
  },
  {
    name: "lm-studio",
    port: 1234,
    modelsEndpoint: "/v1/models",
    modelsParser: (data) => {
      const items = (data.data as { id: string }[] | undefined) ?? []
      return items.map((m) => m.id)
    },
  },
  {
    name: "jan",
    port: 1337,
    modelsEndpoint: "/v1/models",
    modelsParser: (data) => {
      const items = (data.data as { id: string }[] | undefined) ?? []
      return items.map((m) => m.id)
    },
  },
  {
    name: "localai",
    port: 8080,
    modelsEndpoint: "/v1/models",
    modelsParser: (data) => {
      const items = (data.data as { id: string }[] | undefined) ?? []
      return items.map((m) => m.id)
    },
  },
  {
    name: "gpt4all",
    port: 4891,
    modelsEndpoint: "/v1/models",
    modelsParser: (data) => {
      const items = (data.data as { id: string }[] | undefined) ?? []
      return items.map((m) => m.id)
    },
  },
]

async function probeServer(config: ServerConfig): Promise<LocalServer | null> {
  const baseUrl = `http://localhost:${config.port}`

  try {
    const res = await fetch(`${baseUrl}${config.modelsEndpoint}`, {
      signal: AbortSignal.timeout(2000),
    })

    if (!res.ok) return null

    const data = (await res.json()) as Record<string, unknown>
    const models = config.modelsParser(data)

    return { name: config.name, baseUrl, models }
  } catch {
    return null
  }
}

export async function detectLocalServers(): Promise<LocalServer[]> {
  const results = await Promise.allSettled(
    KNOWN_SERVERS.map((config) => probeServer(config)),
  )

  return results
    .filter(
      (r): r is PromiseFulfilledResult<LocalServer | null> =>
        r.status === "fulfilled" && r.value !== null,
    )
    .map((r) => r.value as LocalServer)
}
