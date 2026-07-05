import type { LevelProgress } from "../types/progression";

export function xpRequiredForLevel(level: number) {
  return Math.floor(100 * Math.pow(Math.max(level, 1), 1.5));
}

export function calculateProgress(value: number, target: number) {
  if (target <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((value / target) * 100)));
}

export function cumulativeXPForLevel(level: number) {
  let total = 0;

  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    total += xpRequiredForLevel(currentLevel);
  }

  return total;
}

export function xpForLevelState(level: number, xpInCurrentLevel: number) {
  return cumulativeXPForLevel(level) + xpInCurrentLevel;
}

export function calculateLevel(totalXP: number): LevelProgress {
  let currentLevel = 1;
  let remainingXP = Math.max(0, totalXP);
  let xpNeededForNextLevel = xpRequiredForLevel(currentLevel);

  while (remainingXP >= xpNeededForNextLevel) {
    remainingXP -= xpNeededForNextLevel;
    currentLevel += 1;
    xpNeededForNextLevel = xpRequiredForLevel(currentLevel);
  }

  return {
    currentLevel,
    xpInCurrentLevel: remainingXP,
    xpNeededForNextLevel,
    progress: calculateProgress(remainingXP, xpNeededForNextLevel),
  };
}
