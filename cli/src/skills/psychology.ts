import type { ContentType } from "../types.js"

export interface PsychPrinciple {
  name: string
  description: string
  application: string
}

export const PSYCHOLOGY_PRINCIPLES: Record<string, PsychPrinciple> = {
  social_proof: {
    name: "Social Proof",
    description: "People look to others' actions to determine their own. We follow the crowd.",
    application: "Show that others use and trust the product. Numbers, testimonials, logos, GitHub stars.",
  },
  scarcity: {
    name: "Scarcity",
    description: "Limited availability increases perceived value. People want what they might lose.",
    application: "Highlight limited-time features, early-adopter benefits, or exclusive access.",
  },
  loss_aversion: {
    name: "Loss Aversion",
    description: "Losing something feels twice as painful as gaining something equivalent.",
    application: "Frame around what the reader loses by NOT using the tool. 'Stop losing hours to...'",
  },
  endowment: {
    name: "Endowment Effect",
    description: "People value things more once they own them.",
    application: "Encourage trying the tool. Free trials and freemium create ownership.",
  },
  ikea_effect: {
    name: "IKEA Effect",
    description: "People value things more when they helped create them.",
    application: "Highlight customization, configuration, and the builder experience.",
  },
  mere_exposure: {
    name: "Mere Exposure",
    description: "Familiarity breeds liking. People prefer things they have seen before.",
    application: "Consistent presence across platforms builds preference over time.",
  },
  curiosity_gap: {
    name: "Curiosity Gap",
    description: "When people know something exists but not the details, they feel compelled to find out.",
    application: "Tease the outcome without revealing the method. Open loops that pull readers in.",
  },
  pratfall: {
    name: "Pratfall Effect",
    description: "Competent people become more likable when they show a small flaw.",
    application: "Acknowledge limitations honestly. 'We are not great at X, but we are the best at Y.'",
  },
  present_bias: {
    name: "Present Bias",
    description: "People strongly prefer immediate rewards over future ones.",
    application: "Emphasize immediate benefits. 'Start saving time today' beats 'See ROI in 6 months'.",
  },
  peak_end: {
    name: "Peak-End Rule",
    description: "People judge experiences by the peak moment and the end, not the average.",
    application: "Design memorable hooks (peak) and strong closings (end) in every post.",
  },
  zeigarnik: {
    name: "Zeigarnik Effect",
    description: "Unfinished tasks occupy the mind more than completed ones. Open loops create tension.",
    application: "Create open loops in content. Tease what comes next. Leave the reader wanting more.",
  },
  anchoring: {
    name: "Anchoring",
    description: "The first number or piece of information sets the frame for everything after.",
    application: "Lead with an impressive number or contrast. '10x faster' anchors the reader's expectations.",
  },
  paradox_of_choice: {
    name: "Paradox of Choice",
    description: "Too many options overwhelm and paralyze. Fewer choices lead to more decisions.",
    application: "Recommend one clear action. Do not present multiple CTAs.",
  },
  jobs_to_be_done: {
    name: "Jobs to Be Done",
    description: "People hire products to get a job done. Focus on outcomes, not features.",
    application: "Frame the product around what job it accomplishes, not its specifications.",
  },
  first_principles: {
    name: "First Principles",
    description: "Break problems down to basic truths and build solutions from there.",
    application: "Explain WHY the tool exists, not just WHAT it does. Connect to root problems.",
  },
}

const CONTENT_PSYCH_MAP: Record<ContentType, string[]> = {
  feature_highlight: ["endowment", "loss_aversion", "jobs_to_be_done", "present_bias"],
  release_announcement: ["social_proof", "curiosity_gap", "mere_exposure", "anchoring"],
  dev_tip: ["ikea_effect", "curiosity_gap", "first_principles"],
  behind_the_scenes: ["pratfall", "mere_exposure", "peak_end"],
  tutorial_teaser: ["curiosity_gap", "zeigarnik", "ikea_effect"],
  milestone_celebration: ["social_proof", "anchoring", "mere_exposure"],
}

export function getPsychPrinciples(contentType: ContentType): PsychPrinciple[] {
  const keys = CONTENT_PSYCH_MAP[contentType] ?? ["social_proof", "curiosity_gap"]
  return keys
    .map((k) => PSYCHOLOGY_PRINCIPLES[k])
    .filter((p): p is PsychPrinciple => !!p)
}
