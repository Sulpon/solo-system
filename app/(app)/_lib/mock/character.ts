import type { CharacterProfile } from "../types/progression";

export const characterProfile: CharacterProfile = {
  name: "MENACE",
  title: "System Initiate",
  rank: "D",
  overallXP: 0,
  currentLevel: 1,
  currentStreak: 0,
  powerScore: 0,
};

export const dashboardHero = {
  name: characterProfile.name,
  title: characterProfile.title,
  level: characterProfile.currentLevel,
  rank: characterProfile.rank,
  xp: 0,
  maxXp: 1,
  streak: characterProfile.currentStreak,
  powerScore: characterProfile.powerScore,
};
