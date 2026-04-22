import { defineConnector } from "../interface.js"

export const devtoConnector = defineConnector({
  id: "devto",
  name: "Dev.to",
  capabilities: {
    maxLength: 100000,
    supportsArticle: true,
  },
})
