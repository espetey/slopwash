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

export const CURRENT_MODEL_WATCH_PHRASES = [
  "matters because",
  "what matters more than",
  "this matters",
  "without sacrificing",
  "without losing",
  "without compromising",
  "is genuinely",
  "less like",
  "load-bearing",
];

export const CURRENT_MODEL_WATCH_WORDS = [
  "deliberate",
  "measured",
  "steady",
  "honestly",
  "frankly",
  "quietly",
  "silently",
  "significant",
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
  "moreover",
  "furthermore",
  "in addition",
  "on the other hand",
];

export const REVEAL_OPENERS = [
  "honestly",
  "frankly",
  "genuinely",
  "candidly",
  "to be honest",
  "let's be honest",
  "I'll be direct",
  "let me be clear",
  "here's the thing",
  "the truth is",
  "the uncomfortable truth",
  "what most people miss",
  "the part nobody talks about",
  "it turns out",
];

export const BUTTON_PHRASES = [
  "and that changes everything",
  "that's the point",
  "which is exactly the problem",
];

export const ANSWER_LABELS = [
  "the result",
  "the catch",
  "the kicker",
  "here's where it gets interesting",
  "enter",
  "plot twist",
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
  "if you want, I can also",
  "want me to turn this into a checklist",
  "happy to adjust the tone",
  "here's a clean version",
  "here's a tight, no-fluff breakdown",
  "short answer",
  "bottom line",
  "why this works",
];

export const SYCOPHANTIC_OPENERS = [
  "great question",
  "that's a fascinating",
  "that's an excellent",
  "that's a great question",
  "what a great question",
  "you're not imagining it",
  "you're right to push back",
  "great catch",
  "you're absolutely right",
  "I'm going to push back here",
  "I'll be blunt",
  "hot take",
  "unpopular opinion",
];

export const DRAMA_WORDS = [
  "deeply",
  "truly",
  "incredibly",
  "fundamentally",
  "profoundly",
  "remarkably",
  "meaningfully",
];

export const HOUSE_VOICE_PHRASES = [
  "you've got this",
  "you're closer than you think",
  "that's a real win",
  "let's lock it in",
  "I find myself",
  "this sits at the intersection of",
  "the question underneath the question",
  "there's a real tension here",
  "it's worth naming",
  "both things can be true",
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
  "plays a vital role",
  "leaves a lasting impact",
  "continues to captivate",
  "this matters because",
  "what matters more",
  "the implications are significant",
  "the stakes couldn't be higher",
  "has drawn widespread attention",
];

export const OVERCORRECTION_WORDS = [
  "harness",
  "mosaic",
  "patchwork",
  "cornerstone",
  "linchpin",
  "bedrock",
  "hallmark",
  "elevate",
  "amplify",
  "supercharge",
  "streamline",
  "resonate",
  "nuanced",
  "holistic",
  "ecosystem",
  "realm",
  "beacon",
  "myriad",
  "plethora",
  "palpable",
  "compelling",
];

export const OVERCORRECTION_PHRASES = [
  "dig into",
];
