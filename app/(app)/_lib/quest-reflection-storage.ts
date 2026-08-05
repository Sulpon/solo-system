import type { QuestReflection, ReflectionFeelingAfter, ReflectionHardest, ReflectionMood } from "./types/reflection";

export function createQuestReflection(
  questId: string,
  input: Readonly<{
    mood: ReflectionMood;
    hardest?: ReflectionHardest;
    hardestOtherNote?: string;
    feelingAfter?: ReflectionFeelingAfter;
    note?: string;
  }>,
  questCompletionId?: string | null,
  createdAt = new Date().toISOString(),
): QuestReflection {
  return {
    id: `${questId}-${createdAt}`,
    questId,
    questCompletionId: questCompletionId ?? null,
    mood: input.mood,
    hardest: input.hardest,
    hardestOtherNote: input.hardestOtherNote,
    feelingAfter: input.feelingAfter,
    note: input.note,
    createdAt,
  };
}
