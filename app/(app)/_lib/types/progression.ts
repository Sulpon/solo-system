export type MainQuestObjective = Readonly<{
  id: string;
  title: string;
  completed: boolean;
}>;

export type MainQuest = Readonly<{
  title: string;
  description: string;
  progress: number;
  objectives: MainQuestObjective[];
}>;

export type CharacterProfile = Readonly<{
  name: string;
  title: string;
  rank: string;
  overallXP: number;
  currentLevel: number;
  currentStreak: number;
  powerScore: number;
}>;

export type LevelProgress = Readonly<{
  currentLevel: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  progress: number;
}>;

export type XpEventAttributeReward = Readonly<{
  attributeId: import("./category").CategoryId;
  amount: number;
}>;

export type XpEventSourceType = "quest" | "dream" | "goal" | "milestone" | "progress_goal" | "sequential_step" | "sequential_milestone";

export type XpEvent = Readonly<{
  id: string;
  sourceType: XpEventSourceType;
  sourceId: string;
  sourceTitle: string;
  amount: number;
  attributeXp: XpEventAttributeReward[];
  createdAt: string;
}>;
