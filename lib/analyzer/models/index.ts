import type { Violation } from "../types";

export interface ModelProfile {
  id: string;
  label: string;
  promptOverlay: string;
  check: (text: string) => Violation[];
}

import { gpt4Profile } from "./gpt4";
import { claudeProfile } from "./claude";
import { geminiProfile } from "./gemini";
import { llamaProfile } from "./llama";

const profiles: ModelProfile[] = [
  gpt4Profile,
  claudeProfile,
  geminiProfile,
  llamaProfile,
];

export const modelIds = profiles.map((p) => p.id);

export function getModelProfile(id: string): ModelProfile | undefined {
  return profiles.find((p) => p.id === id);
}

export function getAllModelProfiles(): ModelProfile[] {
  return profiles;
}
