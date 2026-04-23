export const COPYWRITING_PRINCIPLES = [
  "Clarity over cleverness. If you must choose, choose clear.",
  "Benefits over features. Features say what it does. Benefits say what that means for the reader.",
  "Specificity over vagueness. 'Cut weekly reporting from 4 hours to 15 minutes' beats 'Save time'.",
  "Use customer language, not company language. Mirror how real users describe their problems.",
  "One idea per section. Each paragraph should advance one argument.",
  "Active voice over passive. 'We generate reports' not 'Reports are generated'.",
  "Remove qualifiers: 'almost', 'very', 'really', 'just' weaken copy.",
  "Show, don't tell. Describe the outcome instead of using adverbs.",
]

export const HEADLINE_FORMULAS = [
  "{Achieve outcome} without {pain point}",
  "The {category} for {audience}",
  "Never {unpleasant event} again",
  "{Question highlighting main pain point}?",
  "How {known company/person} {achieved result}",
  "What I learned {doing thing} for {time period}",
  "{Number} {things} every {audience} should know about {topic}",
  "I {did thing} and here is what happened",
]

export const CTA_FORMULAS = [
  "Start Free Trial (communicate what they get, not what they do)",
  "Get {outcome} in {timeframe}",
  "See how it works",
  "Try it free. No credit card required.",
]

export const STYLE_RULES = {
  doNotUse: [
    "streamline", "optimize", "innovative", "leverage",
    "utilize", "facilitate", "synergy", "best-in-class",
    "cutting-edge", "game-changer", "revolutionary",
  ],
  useInstead: [
    "Use 'use' not 'utilize'",
    "Use 'help' not 'facilitate'",
    "Use 'improve' not 'optimize' (unless literally about optimization)",
    "Use specific outcomes not buzzwords",
  ],
  techniques: [
    "Use rhetorical questions to engage readers and make them think about their own situation.",
    "Use analogies to make abstract concepts concrete and memorable.",
    "Be direct. Get to the point. Do not bury the value in qualifications.",
    "Pepper in humor when appropriate. Puns and wit make copy memorable.",
  ],
}

export interface CopywritingSlice {
  principles: string[]
  headlines: string[]
  style: string[]
}

export function getCopywritingSlice(forShortForm: boolean): CopywritingSlice {
  const principles = forShortForm
    ? COPYWRITING_PRINCIPLES.slice(0, 4)
    : COPYWRITING_PRINCIPLES

  const headlines = forShortForm
    ? HEADLINE_FORMULAS.slice(0, 4)
    : HEADLINE_FORMULAS

  const style = [
    ...STYLE_RULES.useInstead.slice(0, 2),
    ...STYLE_RULES.techniques.slice(0, forShortForm ? 2 : 4),
  ]

  return { principles, headlines, style }
}
