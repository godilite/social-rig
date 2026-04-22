import { defineConnector } from "../interface.js"

export const xConnector = defineConnector({
  id: "x",
  name: "X (Twitter)",
  capabilities: {
    maxLength: 280,
    supportsThreads: true,
    supportsMedia: true,
  },
})
