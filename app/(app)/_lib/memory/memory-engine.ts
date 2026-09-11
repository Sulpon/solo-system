import {
  extractFactMemories,
  extractGoalIntentionMemories,
  extractWorkingTimeMemory,
  extractAbandonmentPatterns,
  extractConsistentHabitPatterns,
  extractExperienceMemories,
  extractLessonMemories,
  type MemoryEngineInput,
} from "./memory-extraction-engine";
import type { PersonalMemory } from "./types";

// Phase 13's top-level Memory composition: Existing Atlas Data -> Extract
// (memory-extraction-engine.ts) -> combined PersonalMemory[]. Deduplication
// (Step 28) falls out of the architecture for free: every extractor already
// produces deterministic ids from stable source ids (Quest/Goal/Skill/
// AchievementMoment ids), so re-evaluating the exact same underlying data
// always yields the exact same memory set - there is nothing to persist or
// reconcile. The Map-by-id below is a defensive de-dup, not the primary
// mechanism.
export type { MemoryEngineInput } from "./memory-extraction-engine";

export function computePersonalMemory(input: MemoryEngineInput): PersonalMemory[] {
  const candidates: PersonalMemory[] = [
    ...extractFactMemories(input),
    ...extractGoalIntentionMemories(input),
    ...extractAbandonmentPatterns(input),
    ...extractConsistentHabitPatterns(input),
    ...extractExperienceMemories(input),
    ...extractLessonMemories(input),
  ];

  const workingTime = extractWorkingTimeMemory(input);
  if (workingTime) candidates.push(workingTime);

  const byId = new Map<string, PersonalMemory>();
  for (const memory of candidates) {
    byId.set(memory.id, memory);
  }

  return Array.from(byId.values());
}
