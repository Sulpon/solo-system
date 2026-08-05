export type ReflectionMood = "excellent" | "good" | "normal" | "difficult" | "very-difficult";
export type ReflectionHardest = "starting" | "discipline" | "time" | "energy" | "focus" | "other";
export type ReflectionFeelingAfter = "energized" | "better" | "same" | "tired";

export type QuestReflection = Readonly<{
  id: string;
  questId: string;
  questCompletionId?: string | null;
  mood: ReflectionMood;
  hardest?: ReflectionHardest;
  hardestOtherNote?: string;
  feelingAfter?: ReflectionFeelingAfter;
  note?: string;
  createdAt: string;
}>;

// Ordered worst -> best. This is the numeric backbone every aggregate in
// reflection-engine.ts (averages, trends, rankings) is built on.
export const REFLECTION_MOOD_SCORE: Record<ReflectionMood, number> = {
  "very-difficult": 1,
  difficult: 2,
  normal: 3,
  good: 4,
  excellent: 5,
};

export const REFLECTION_FEELING_SCORE: Record<ReflectionFeelingAfter, number> = {
  tired: 1,
  same: 2,
  better: 3,
  energized: 4,
};
