export interface BenchmarkEntry {
  model: string;
  label: string;
  version: string;
  avgScore: number;
  worstSection: string;
  commonTells: string[];
  prompts: { prompt: string; score: number }[];
}

export const benchmarkData: BenchmarkEntry[] = [
  {
    model: "gpt-4o",
    label: "GPT-4o",
    version: "2025-01",
    avgScore: 42,
    worstSection: "Vocabulary",
    commonTells: ["delve", "tapestry", "it's worth noting", "deep dive"],
    prompts: [
      { prompt: "Explain quantum computing to a general audience", score: 38 },
      { prompt: "Write a profile of a small-town bakery", score: 35 },
      { prompt: "Summarize the history of the internet", score: 44 },
      { prompt: "Describe how supply chains work", score: 51 },
    ],
  },
  {
    model: "claude",
    label: "Claude 4 Sonnet",
    version: "2025-05",
    avgScore: 56,
    worstSection: "Tone & Voice",
    commonTells: [
      "I'd be happy to help",
      "I should note",
      "That said",
      "I appreciate",
    ],
    prompts: [
      { prompt: "Explain quantum computing to a general audience", score: 54 },
      { prompt: "Write a profile of a small-town bakery", score: 52 },
      { prompt: "Summarize the history of the internet", score: 58 },
      { prompt: "Describe how supply chains work", score: 60 },
    ],
  },
  {
    model: "gemini",
    label: "Gemini 2.5 Pro",
    version: "2025-03",
    avgScore: 45,
    worstSection: "Structure",
    commonTells: [
      "That's a great question!",
      "Here's a breakdown",
      "Absolutely!",
      "Let me provide you",
    ],
    prompts: [
      { prompt: "Explain quantum computing to a general audience", score: 40 },
      { prompt: "Write a profile of a small-town bakery", score: 42 },
      { prompt: "Summarize the history of the internet", score: 48 },
      { prompt: "Describe how supply chains work", score: 50 },
    ],
  },
  {
    model: "llama",
    label: "Llama 4 Maverick",
    version: "2025-04",
    avgScore: 39,
    worstSection: "Tone & Voice",
    commonTells: [
      "It is essential to",
      "One must consider",
      "Furthermore",
      "In order to",
    ],
    prompts: [
      { prompt: "Explain quantum computing to a general audience", score: 36 },
      { prompt: "Write a profile of a small-town bakery", score: 34 },
      { prompt: "Summarize the history of the internet", score: 42 },
      { prompt: "Describe how supply chains work", score: 44 },
    ],
  },
  {
    model: "grok-3",
    label: "Grok 3",
    version: "2025-02",
    avgScore: 48,
    worstSection: "Vocabulary",
    commonTells: [
      "dive into",
      "game-changing",
      "leverage",
      "seamless",
    ],
    prompts: [
      { prompt: "Explain quantum computing to a general audience", score: 44 },
      { prompt: "Write a profile of a small-town bakery", score: 46 },
      { prompt: "Summarize the history of the internet", score: 50 },
      { prompt: "Describe how supply chains work", score: 52 },
    ],
  },
];
