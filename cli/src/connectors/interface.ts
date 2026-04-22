import type { CapabilityFlags, ConnectorPlugin, PlatformVariant } from "../types.js"

export type ConnectorDefinition = {
  id: string
  name: string
  capabilities: Partial<CapabilityFlags>
  auth?: ConnectorPlugin["auth"]
  validate?: ConnectorPlugin["validate"]
  publish?: ConnectorPlugin["publish"]
  status?: ConnectorPlugin["status"]
  analytics?: ConnectorPlugin["analytics"]
}

export function defaultCapabilities(): CapabilityFlags {
  return {
    supportsThreads: false,
    supportsArticle: false,
    supportsScheduling: false,
    supportsAnalytics: false,
    supportsMedia: false,
    supportsDraftUpdate: false,
    supportsCarousel: false,
    maxLength: 280,
  }
}

function stubAuth(_config: Record<string, unknown>): Promise<{ success: boolean; credentials?: Record<string, unknown> }> {
  console.log("Auth not yet implemented (Phase 1 stub)")
  return Promise.resolve({ success: false })
}

function stubValidate(_credentials: Record<string, unknown>): Promise<boolean> {
  console.log("Validate not yet implemented (Phase 1 stub)")
  return Promise.resolve(false)
}

function stubPublish(_draft: PlatformVariant, _credentials: Record<string, unknown>): Promise<{ postId: string; url: string }> {
  console.log("Publish not yet implemented (Phase 1 stub)")
  return Promise.resolve({ postId: "", url: "" })
}

export function defineConnector(config: ConnectorDefinition): ConnectorPlugin {
  return {
    id: config.id,
    name: config.name,
    capabilities: { ...defaultCapabilities(), ...config.capabilities },
    auth: config.auth ?? stubAuth,
    validate: config.validate ?? stubValidate,
    publish: config.publish ?? stubPublish,
    status: config.status,
    analytics: config.analytics,
  }
}
