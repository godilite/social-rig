import { defineConnector } from "../interface.js"

export const linkedinConnector = defineConnector({
  id: "linkedin",
  name: "LinkedIn",
  capabilities: {
    maxLength: 3000,
    supportsArticle: true,
    supportsMedia: true,
  },
})
