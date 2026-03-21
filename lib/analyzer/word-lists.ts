// Extracted from CORE_RULES in lib/prompt.ts.
// These are the canonical word/phrase lists used by the analyzer.

// --- Section 1: Vocabulary ---

export const HIGH_SEVERITY_WORDS = [
  "delve",
  "tapestry",
  "testament",
  "vibrant",
  "intricate",
  "intricacies",
  "pivotal",
  "underscore",
  "landscape",
  "meticulous",
  "meticulously",
  "garner",
  "interplay",
  "bolstered",
  "fostering",
  "showcasing",
  "enduring",
  "crucial",
  "enhance",
  "multifaceted",
  "navigate",
  "leverage",
  "unlock",
  "empower",
  "empowerment",
  "transformative",
  "seamless",
  "seamlessly",
  "robust",
  "utilize",
  "facilitate",
  "unpack",
  "actionable",
];

export const HIGH_SEVERITY_PHRASES = [
  "dive into",
  "deep dive",
  "journey",
  "game-changing",
  "game-changer",
  "moving forward",
  "going forward",
];

export const MODERATE_SEVERITY_WORDS = [
  "additionally",
  "align with",
  "boasts",
  "emphasizing",
  "highlighting",
  "key",
  "valuable",
  "profound",
  "groundbreaking",
  "renowned",
  "nestled",
  "diverse array",
  "rich",
  "exemplifies",
  "commitment to",
  "in the heart of",
  "evolving",
  "focal point",
  "indelible mark",
  "deeply rooted",
];

export const PHRASE_LEVEL_TELLS = [
  "in today's world",
  "when it comes to",
  "a wide range of",
  "it goes without saying",
  "needless to say",
  "at the end of the day",
  "as we move forward",
  "at its core",
];

export const COPULA_SUBSTITUTES = [
  "serves as",
  "stands as",
];

// --- Section 2: Structure ---

export const SUMMARY_OPENERS = [
  "in summary",
  "in conclusion",
  "overall",
  "taken together",
];

export const TRANSITION_FILLERS = [
  "with this in mind",
  "building on this",
  "that said",
  "having said that",
  "in light of this",
];

export const HOLLYWOOD_ENDINGS = [
  "as .+ continues? to evolve",
  "as .+ continues? to grow",
  "as .+ continues? to develop",
  "its potential remains",
  "the future looks",
  "the possibilities are",
];

// --- Section 3: Tone ---

export const HEDGING_PHRASES = [
  "it's important to note",
  "it is important to note",
  "it's worth mentioning",
  "it is worth mentioning",
  "it's crucial to remember",
  "it is crucial to remember",
  "it should be noted that",
];

export const CHAT_RESIDUE = [
  "I hope this helps",
  "let me know if you'd like",
  "let me know if you would like",
  "would you like me to continue",
  "certainly!",
  "of course!",
];

export const FALSE_INTIMACY = [
  "here's the thing",
  "let's be honest",
  "the truth is",
];

export const SYCOPHANTIC_OPENERS = [
  "great question",
  "that's a fascinating",
  "that's an excellent",
  "that's a great question",
  "what a great question",
];

// --- Section 5: Content ---

export const WEASEL_PHRASES = [
  "experts argue",
  "experts suggest",
  "researchers have noted",
  "observers have cited",
  "industry reports suggest",
  "critics contend",
  "scholars suggest",
  "analysts argue",
];

export const SOURCE_EXAGGERATION = [
  "several publications have noted",
  "several studies suggest",
  "several experts agree",
  "several researchers have found",
  "many experts believe",
  "numerous studies have shown",
];

export const SIGNIFICANCE_CLAIMS = [
  "marks a pivotal moment",
  "represents a significant shift",
  "was part of a broader movement",
  "reflects the enduring legacy",
  "setting the stage for",
  "shaping the evolving landscape",
  "marks a turning point",
  "ushering in a new era",
];
