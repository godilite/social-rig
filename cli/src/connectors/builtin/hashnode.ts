import { defineConnector } from "../interface.js"

export const hashnodeConnector = defineConnector({
  id: "hashnode",
  name: "Hashnode",
  capabilities: {
    maxLength: 100000,
    supportsArticle: true,
  },
})
