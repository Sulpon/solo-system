import type { QuestCompletion } from "../types/quest";

// Single source of truth for the default - never hardcode 100 elsewhere.
export const DEFAULT_QUEST_MASTERY_MULTIPLIER = 100;

// One knob controls the whole curve's shape - see calculateQuestMastery.
const MASTERY_CURVE_EXPONENT = 1.8;

export function getQuestMasteryLevel100Target(baseXp: number, multiplier: number = DEFAULT_QUEST_MASTERY_MULTIPLIER): number {
  return Math.max(0, Math.round(Math.max(0, baseXp) * Math.max(1, multiplier)));
}

// Each completion's *historical* base XP is xpAwarded with its own recorded
// bonuses subtracted back out - algebraically exactly quest.xp as it was at
// that completion's time (xpAwarded = quest.xp(then) + streakBonusXp +
// challengeBonusXp), so this is immune to later edits of the quest's current
// xp field. Per AGENTS.md: "Changing quest XP must never modify previously
// awarded XP." Pure derive over data QuestCompletion already stores - no new
// field, no new storage, no backfill.
function getCompletionBaseXp(completion: QuestCompletion): number {
  return Math.max(0, completion.xpAwarded - completion.streakBonusXp - (completion.challengeBonusXp ?? 0));
}

export function getQuestMasteryXP(questId: string, completions: ReadonlyArray<QuestCompletion>): number {
  return completions.filter((completion) => completion.questId === questId).reduce((sum, completion) => sum + getCompletionBaseXp(completion), 0);
}

export type QuestMasteryProgress = Readonly<{
  masteryXP: number;
  currentLevel: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
  level100Target: number;
  progressTowardLevel100Percent: number;
}>;

// Direct power-law scaled to the known endpoint - cumulativeXp(100) equals
// level100Target by construction, no summation-normalization needed. Early
// levels are cheap, later levels progressively more expensive.
function cumulativeMasteryXpForLevel(level: number, level100Target: number): number {
  const clampedLevel = Math.max(0, Math.min(100, level));
  return Math.round(level100Target * Math.pow(clampedLevel / 100, MASTERY_CURVE_EXPONENT));
}

function calculateQuestMasteryLevel(masteryXP: number, level100Target: number): number {
  if (level100Target <= 0) {
    return 1;
  }

  const xp = Math.max(0, masteryXP);

  if (xp >= level100Target) {
    return 100;
  }

  const raw = 100 * Math.pow(xp / level100Target, 1 / MASTERY_CURVE_EXPONENT);
  return Math.max(1, Math.min(100, Math.floor(raw) + 1));
}

export function calculateQuestMastery(masteryXP: number, level100Target: number): QuestMasteryProgress {
  const xp = Math.max(0, masteryXP);
  const currentLevel = calculateQuestMasteryLevel(xp, level100Target);
  const currentLevelFloor = cumulativeMasteryXpForLevel(currentLevel - 1, level100Target);
  const nextLevelFloor = currentLevel >= 100 ? level100Target : cumulativeMasteryXpForLevel(currentLevel, level100Target);
  const xpInCurrentLevel = Math.max(0, xp - currentLevelFloor);
  const xpNeededForNextLevel = Math.max(0, nextLevelFloor - currentLevelFloor);

  return {
    masteryXP: xp,
    currentLevel,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progressPercent: xpNeededForNextLevel > 0 ? Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100)) : 100,
    level100Target,
    progressTowardLevel100Percent: level100Target > 0 ? Math.min(100, Math.round((xp / level100Target) * 100)) : 100,
  };
}

const IDENTITY_TITLES: ReadonlyArray<Readonly<{ maxLevel: number; title: string }>> = [
  { maxLevel: 10, title: "Seeker" },
  { maxLevel: 20, title: "Hunter" },
  { maxLevel: 30, title: "Pursuer" },
  { maxLevel: 40, title: "Nightmare" },
  { maxLevel: 50, title: "Assassin" },
  { maxLevel: 60, title: "Reaper" },
  { maxLevel: 70, title: "Legend" },
  { maxLevel: 80, title: "Warlord" },
  { maxLevel: 90, title: "King" },
  { maxLevel: 99, title: "Sage" },
  { maxLevel: 100, title: "Master" },
];

// Single utility - title is always derived from level, never stored.
export function getQuestMasteryTitle(level: number): string {
  const clamped = Math.max(1, Math.min(100, Math.floor(level)));
  return IDENTITY_TITLES.find((entry) => clamped <= entry.maxLevel)?.title ?? "Master";
}

export type NextIdentityMilestone = Readonly<{
  level: number;
  title: string;
  xpNeeded: number;
}>;

// The upcoming Identity Title transition (e.g. Assassin -> Reaper at level
// 51), with the exact XP still needed to reach it - null once already at
// Level 100 / Master, since there is nothing further to evolve into.
export function getNextIdentityMilestone(masteryXP: number, level100Target: number): NextIdentityMilestone | null {
  const xp = Math.max(0, masteryXP);
  const currentLevel = calculateQuestMasteryLevel(xp, level100Target);

  if (currentLevel >= 100) {
    return null;
  }

  const currentTier = IDENTITY_TITLES.find((entry) => currentLevel <= entry.maxLevel);
  const nextLevel = Math.min(100, (currentTier?.maxLevel ?? currentLevel) + 1);

  return {
    level: nextLevel,
    title: getQuestMasteryTitle(nextLevel),
    xpNeeded: Math.max(0, cumulativeMasteryXpForLevel(nextLevel, level100Target) - xp),
  };
}
