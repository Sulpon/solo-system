import type { QuestCompletion } from "../types/quest";

// Single source of truth for the default - never hardcode 100 elsewhere.
export const DEFAULT_QUEST_MASTERY_MULTIPLIER = 100;

// One knob controls the whole curve's shape - see calculateQuestMastery.
const MASTERY_CURVE_EXPONENT = 1.8;

// Coerces to a safe finite number, falling back rather than ever letting
// undefined/null/NaN reach arithmetic - a legacy Quest/QuestCompletion
// record (created before a field existed, or edited through a path that
// didn't validate it) can otherwise turn this whole chain into NaN, which
// is exactly the "Level NaN" bug this guards against at its source.
function toSafeNumber(value: unknown, fallback: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function getQuestMasteryLevel100Target(baseXp: number, multiplier: number = DEFAULT_QUEST_MASTERY_MULTIPLIER): number {
  const safeBaseXp = Math.max(0, toSafeNumber(baseXp, 0));
  const safeMultiplier = Math.max(1, toSafeNumber(multiplier, DEFAULT_QUEST_MASTERY_MULTIPLIER));
  return Math.max(0, Math.round(safeBaseXp * safeMultiplier));
}

// Each completion's *historical* base XP is xpAwarded with its own recorded
// bonuses subtracted back out - algebraically exactly quest.xp as it was at
// that completion's time (xpAwarded = quest.xp(then) + streakBonusXp +
// challengeBonusXp), so this is immune to later edits of the quest's current
// xp field. Per AGENTS.md: "Changing quest XP must never modify previously
// awarded XP." Pure derive over data QuestCompletion already stores - no new
// field, no new storage, no backfill.
function getCompletionBaseXp(completion: QuestCompletion): number {
  const xpAwarded = toSafeNumber(completion.xpAwarded, 0);
  const streakBonusXp = toSafeNumber(completion.streakBonusXp, 0);
  const challengeBonusXp = toSafeNumber(completion.challengeBonusXp, 0);
  return Math.max(0, xpAwarded - streakBonusXp - challengeBonusXp);
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
  const clampedLevel = Math.max(0, Math.min(100, toSafeNumber(level, 0)));
  const safeTarget = Math.max(0, toSafeNumber(level100Target, 0));
  return Math.round(safeTarget * Math.pow(clampedLevel / 100, MASTERY_CURVE_EXPONENT));
}

function calculateQuestMasteryLevel(masteryXP: number, level100Target: number): number {
  const safeTarget = Math.max(0, toSafeNumber(level100Target, 0));

  if (safeTarget <= 0) {
    return 1;
  }

  const xp = Math.max(0, toSafeNumber(masteryXP, 0));

  if (xp >= safeTarget) {
    return 100;
  }

  const raw = 100 * Math.pow(xp / safeTarget, 1 / MASTERY_CURVE_EXPONENT);
  return Math.max(1, Math.min(100, Math.floor(raw) + 1));
}

export function calculateQuestMastery(masteryXP: number, level100Target: number): QuestMasteryProgress {
  const xp = Math.max(0, toSafeNumber(masteryXP, 0));
  const safeLevel100Target = Math.max(0, toSafeNumber(level100Target, 0));
  const currentLevel = calculateQuestMasteryLevel(xp, safeLevel100Target);
  const currentLevelFloor = cumulativeMasteryXpForLevel(currentLevel - 1, safeLevel100Target);
  const nextLevelFloor = currentLevel >= 100 ? safeLevel100Target : cumulativeMasteryXpForLevel(currentLevel, safeLevel100Target);
  const xpInCurrentLevel = Math.max(0, xp - currentLevelFloor);
  const xpNeededForNextLevel = Math.max(0, nextLevelFloor - currentLevelFloor);

  return {
    masteryXP: xp,
    currentLevel,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progressPercent: xpNeededForNextLevel > 0 ? Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100)) : 100,
    level100Target: safeLevel100Target,
    progressTowardLevel100Percent: safeLevel100Target > 0 ? Math.min(100, Math.round((xp / safeLevel100Target) * 100)) : 100,
  };
}

// Exactly 10 identities, one per clean 10-level band (1-10, 11-20, ...,
// 91-100) - "Sage" and "Master" previously split the last band unevenly
// (91-99 / 100 only), which is what let an invalid (NaN) level fall through
// every band and hit the old catch-all "Master" fallback below regardless
// of the real level. Merged into "Master" for 91-100 - an existing name,
// not a new one, per spec: "do not invent new names."
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
  { maxLevel: 100, title: "Master" },
];

// Single utility - title is always derived from a *valid* level, never
// stored. An invalid/non-finite level (should no longer be reachable now
// that every numeric input above is sanitized) falls back to the lowest
// real identity rather than the misleading "you're a Master" label a
// NaN previously produced.
export function getQuestMasteryTitle(level: number): string {
  const safeLevel = toSafeNumber(level, 1);
  const clamped = Math.max(1, Math.min(100, Math.floor(safeLevel)));
  return IDENTITY_TITLES.find((entry) => clamped <= entry.maxLevel)?.title ?? IDENTITY_TITLES[0].title;
}

// Defensive UI-only safeguard, not the fix itself - every numeric input
// upstream (Quest.xp, masteryMultiplier, QuestCompletion bonuses) is now
// sanitized before it ever reaches this engine, so `currentLevel` should
// always already be a valid 1-100 integer. If something outside this
// engine's control ever slips an invalid value through anyway, this must
// never render "Level NaN" - and must never silently relabel it "Level 1"
// either, since that would misrepresent real progress as a specific,
// legitimate level. "—" honestly says "unknown," not "level one."
export function formatQuestMasteryLevel(level: number): string {
  return Number.isFinite(level) ? String(Math.max(1, Math.min(100, Math.floor(level)))) : "—";
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
  const xp = Math.max(0, toSafeNumber(masteryXP, 0));
  const safeLevel100Target = Math.max(0, toSafeNumber(level100Target, 0));
  const currentLevel = calculateQuestMasteryLevel(xp, safeLevel100Target);

  if (currentLevel >= 100) {
    return null;
  }

  const currentTier = IDENTITY_TITLES.find((entry) => currentLevel <= entry.maxLevel);
  const nextLevel = Math.min(100, (currentTier?.maxLevel ?? currentLevel) + 1);

  return {
    level: nextLevel,
    title: getQuestMasteryTitle(nextLevel),
    xpNeeded: Math.max(0, cumulativeMasteryXpForLevel(nextLevel, safeLevel100Target) - xp),
  };
}
