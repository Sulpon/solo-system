"use client";

import { useEffect, useRef } from "react";
import { useAttributes } from "./useAttributes";
import { useCelebration } from "./useCelebration";
import { useProgression } from "./useProgression";
import { useRewardCollection } from "./useRewardCollection";
import { useWorkoutSessions } from "./useWorkoutSessions";
import { calculateQuestStreak } from "../daily-system";
import { deriveChallengeProgress } from "../engines/challenge-engine";
import { getRankLabel } from "../engines/level-engine";
import { rollMysteryReward } from "../engines/reward-engine";
import { ACHIEVEMENT_DEFINITIONS } from "../achievements/achievement-definitions";
import type { CelebrationDraft } from "../celebration-store";
import type { ActivityEvent, ActivityEventType } from "../types/activity-event";
import type { XpEvent } from "../types/progression";
import type { UnlockedReward } from "../types/reward";

const GOAL_COMPLETION_EVENT_TYPES: ReadonlySet<ActivityEventType> = new Set([
  "progress_goal_completed",
  "goal_completed",
  "dream_completed",
  "milestone_completed",
]);

// Every event id below is a deterministic composite key (quest+level,
// category+level, achievement id, etc.) rather than including any random
// component - this is what makes the durable dedup checks (against
// activityEvents / the reward collection) actually safe if this effect ever
// runs more than once for the same logical crossing (e.g. React Strict
// Mode's double-invoke in dev), since a random suffix would defeat id-based
// dedup and risk double-counting XP.

// Mounted once at the app root (see ProgressionEventSyncEffect). Follows the
// same idempotent "compute live value, diff against persisted state, act"
// pattern useGoalMetricSync already established for a different domain:
// levels/streaks/challenge progress are never stored, so every crossing is
// detected fresh here rather than tracked at the point of completion. Level/
// attribute/challenge level-ups are additionally gated behind an in-memory
// "already initialized" ref so a page reload never replays every historical
// level-up as a fresh celebration; streak milestones and achievements are
// deduped durably (against activityEvents / the reward collection) instead,
// since those are meant to backfill and celebrate real past progress the
// first time this code runs, not just future changes.
export function useProgressionEventSync() {
  const { isReady, questDefinitions, questCompletions, activityEvents, addActivityEvents, addBonusXpEvents, progressionSummary } = useProgression();
  const { attributes } = useAttributes();
  const { sessions: workoutSessions, hasLoaded: workoutSessionsLoaded } = useWorkoutSessions();
  const { rewardCollection, addRewards, hasLoaded: rewardCollectionLoaded } = useRewardCollection();
  const { enqueueCelebration } = useCelebration();

  const initializedRef = useRef(false);
  const previousLevelRef = useRef(1);
  const previousCategoryLevelsRef = useRef<Record<string, number>>({});
  const previousChallengeLevelsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!isReady || !workoutSessionsLoaded || !rewardCollectionLoaded) {
      return;
    }

    const unlockedRewardIds = new Set(rewardCollection.map((entry) => entry.id));
    const firedStreakMilestones = new Set(
      activityEvents.filter((event) => event.type === "streak_milestone").map((event) => `${event.sourceId}:${event.metadata.streakCount}`),
    );

    const newActivityEvents: ActivityEvent[] = [];
    const newRewards: UnlockedReward[] = [];
    const newBonusXpEvents: XpEvent[] = [];
    const celebrations: CelebrationDraft[] = [];
    const now = new Date().toISOString();

    function alreadyUnlocked(rewardId: string) {
      return unlockedRewardIds.has(rewardId) || newRewards.some((reward) => reward.id === rewardId);
    }

    function rollFreshMysteryReward() {
      return rollMysteryReward(new Set([...unlockedRewardIds, ...newRewards.map((reward) => reward.reward.id)]));
    }

    // --- 1. Global level-up --------------------------------------------------
    const currentLevel = progressionSummary.currentLevel;

    if (!initializedRef.current) {
      previousLevelRef.current = currentLevel;
    } else if (currentLevel > previousLevelRef.current) {
      for (let level = previousLevelRef.current + 1; level <= currentLevel; level += 1) {
        const rankBefore = getRankLabel(level - 1);
        const rankAfter = getRankLabel(level);
        const isRankTransition = rankAfter !== rankBefore;
        const isMajorLevel = level % 5 === 0;

        newActivityEvents.push({
          id: `level_up:${level}`,
          type: "level_up",
          createdAt: now,
          title: `Level ${level} reached`,
          description: isRankTransition ? `Rank ${rankBefore} -> ${rankAfter}` : undefined,
          sourceType: "character",
          sourceId: "global",
          metadata: { level, rank: rankAfter, attributePoints: level - 1 },
        });

        celebrations.push({
          kind: "level_up",
          intensity: isRankTransition ? "legendary" : "major",
          title: `Level ${level}`,
          description: isRankTransition ? `Rank ${rankBefore} -> ${rankAfter}` : `Attribute Points: ${level - 1}`,
          fromValue: level - 1,
          toValue: level,
        });

        const levelRewardId = `level_up:${level}`;
        if (isMajorLevel && !alreadyUnlocked(levelRewardId)) {
          const reward = rollFreshMysteryReward();
          newRewards.push({ id: levelRewardId, unlockedAt: now, sourceType: "level_up", sourceId: String(level), reward });
          celebrations.push({ kind: "mystery_reward", intensity: "legendary", title: "Mystery Reward", description: reward.title, reward });
        }
      }

      previousLevelRef.current = currentLevel;
    }

    // --- 2. Attribute level-up ------------------------------------------------
    for (const category of attributes) {
      const level = progressionSummary.categoryProgressionMap[category.id]?.level ?? 1;
      const previous = previousCategoryLevelsRef.current[category.id] ?? level;

      if (initializedRef.current && level > previous) {
        newActivityEvents.push({
          id: `attribute_level_up:${category.id}:${level}`,
          type: "attribute_level_up",
          createdAt: now,
          title: `${category.name} reached Level ${level}`,
          sourceType: "attribute",
          sourceId: category.id,
          metadata: { attributeId: category.id, attributeName: category.name, level },
        });

        celebrations.push({ kind: "attribute_level_up", intensity: "medium", title: `${category.name}`, description: `Level ${level}`, fromValue: previous, toValue: level });
      }

      previousCategoryLevelsRef.current[category.id] = level;
    }

    // --- 3. Challenge level-up celebration (XP already awarded synchronously,
    // see progression-store.tsx::computeChallengeBonusXp) -----------------------
    for (const quest of questDefinitions) {
      if (!quest.challenge?.enabled) {
        continue;
      }

      const progress = deriveChallengeProgress(quest, questCompletions);
      if (!progress) {
        continue;
      }

      const previous = previousChallengeLevelsRef.current[quest.id] ?? progress.currentLevelIndex;

      if (initializedRef.current && progress.currentLevelIndex > previous) {
        newActivityEvents.push({
          id: `challenge_level_up:${quest.id}:${progress.currentLevelIndex}`,
          type: "challenge_level_up",
          createdAt: now,
          title: `${quest.title}: Challenge Level ${progress.currentLevelIndex + 1}`,
          sourceType: "quest",
          sourceId: quest.id,
          metadata: { questId: quest.id, questName: quest.title, levelIndex: progress.currentLevelIndex },
        });

        celebrations.push({
          kind: "challenge_level_up",
          intensity: "medium",
          title: quest.title,
          description: `Challenge Level ${progress.currentLevelIndex + 1}`,
          fromValue: previous + 1,
          toValue: progress.currentLevelIndex + 1,
        });
      }

      previousChallengeLevelsRef.current[quest.id] = progress.currentLevelIndex;
    }

    // --- 4. Streak milestones --------------------------------------------------
    // A streak only ever increases by exactly 1 per successful scheduled day
    // (see calculateQuestStreak) and resets to 0 on a miss, so every multiple
    // of the interval from `interval` up to the current streak was, at some
    // point, the exact streak count on some day in this unbroken run - no
    // day-by-day history walk needed, just enumerate the multiples.
    for (const quest of questDefinitions) {
      const streak = calculateQuestStreak(quest, questCompletions);
      const interval = Math.max(1, Math.floor(quest.streakMilestoneInterval ?? 10));

      for (let milestone = interval; milestone <= streak; milestone += interval) {
        const key = `${quest.id}:${milestone}`;
        if (firedStreakMilestones.has(key)) {
          continue;
        }
        firedStreakMilestones.add(key);

        const customTitle = quest.streakMilestones?.find((entry) => entry.streakCount === milestone)?.title;
        const badgeTitle = customTitle ?? `${milestone}-Day Streak`;
        const streakXp = milestone * 2;

        newActivityEvents.push({
          id: `streak_milestone:${quest.id}:${milestone}`,
          type: "streak_milestone",
          createdAt: now,
          title: `${quest.title}: ${badgeTitle}`,
          sourceType: "quest",
          sourceId: quest.id,
          metadata: { questId: quest.id, questName: quest.title, streakCount: milestone },
        });

        newBonusXpEvents.push({
          id: `streak_milestone_xp:${quest.id}:${milestone}`,
          sourceType: "streak_milestone",
          sourceId: quest.id,
          sourceTitle: `${quest.title}: ${badgeTitle}`,
          amount: streakXp,
          attributeXp: [{ attributeId: quest.categoryId, amount: streakXp }],
          createdAt: now,
        });

        const badgeRewardId = `streak_milestone:${quest.id}:${milestone}`;
        newRewards.push({
          id: badgeRewardId,
          unlockedAt: now,
          sourceType: "streak_milestone",
          sourceId: quest.id,
          reward: { id: badgeRewardId, type: "badge", rarity: "rare", title: badgeTitle, description: `${milestone}-day streak on ${quest.title}` },
        });

        celebrations.push({ kind: "streak_milestone", intensity: "major", title: badgeTitle, description: `${quest.title} - ${milestone} day streak`, xpGained: streakXp });

        const mysteryReward = rollFreshMysteryReward();
        const mysteryRewardId = `mystery_reward:${quest.id}:${milestone}`;
        newRewards.push({ id: mysteryRewardId, unlockedAt: now, sourceType: "mystery_reward", sourceId: quest.id, reward: mysteryReward });
        celebrations.push({ kind: "mystery_reward", intensity: "legendary", title: "Mystery Reward", description: mysteryReward.title, reward: mysteryReward });
      }
    }

    // --- 5a. Achievements: goal completions (reuses existing goal-tree XP,
    // no bonus XP awarded here - see achievement-definitions.ts) ---------------
    for (const event of activityEvents) {
      if (!GOAL_COMPLETION_EVENT_TYPES.has(event.type)) {
        continue;
      }

      const rewardId = `achievement:goal:${event.sourceId}`;
      if (alreadyUnlocked(rewardId)) {
        continue;
      }

      newRewards.push({
        id: rewardId,
        unlockedAt: now,
        sourceType: "achievement",
        sourceId: event.sourceId,
        reward: { id: rewardId, type: "achievement", rarity: "epic", title: event.title, description: "Goal completed." },
      });

      newActivityEvents.push({
        id: `achievement_unlocked:goal:${event.sourceId}`,
        type: "achievement_unlocked",
        createdAt: now,
        title: `Achievement: ${event.title}`,
        sourceType: "achievement",
        sourceId: event.sourceId,
        metadata: { achievementId: rewardId, source: "goal" },
      });

      celebrations.push({ kind: "achievement", intensity: "major", title: "Achievement Unlocked", description: event.title });
    }

    // --- 5b. Achievements: workout personal records ----------------------------
    for (const session of workoutSessions) {
      for (const record of session.personalRecordsAchieved) {
        const rewardId = `achievement:pr:${record.id}`;
        if (alreadyUnlocked(rewardId)) {
          continue;
        }

        const title = record.exerciseName ? `${record.exerciseName}: New Personal Best` : "New Personal Best";

        newRewards.push({
          id: rewardId,
          unlockedAt: now,
          sourceType: "achievement",
          sourceId: record.id,
          reward: { id: rewardId, type: "achievement", rarity: "rare", title, description: "New personal record." },
        });

        newActivityEvents.push({
          id: `achievement_unlocked:pr:${record.id}`,
          type: "achievement_unlocked",
          createdAt: now,
          title: `Achievement: ${title}`,
          sourceType: "achievement",
          sourceId: record.id,
          metadata: { achievementId: rewardId, source: "workout_pr" },
        });

        newBonusXpEvents.push({
          id: `achievement_xp:pr:${record.id}`,
          sourceType: "achievement",
          sourceId: record.id,
          sourceTitle: title,
          amount: 25,
          attributeXp: [],
          createdAt: now,
        });

        celebrations.push({ kind: "personal_best", intensity: "major", title, xpGained: 25 });
      }
    }

    // --- 5c. Achievements: app-wide quest-completion-count thresholds ---------
    for (const definition of ACHIEVEMENT_DEFINITIONS) {
      const rewardId = `achievement:${definition.id}`;
      if (alreadyUnlocked(rewardId)) {
        continue;
      }

      const liveValue = definition.compute({ questCompletions });
      if (liveValue < definition.target) {
        continue;
      }

      newRewards.push({
        id: rewardId,
        unlockedAt: now,
        sourceType: "achievement",
        sourceId: definition.id,
        reward: { id: rewardId, type: "achievement", rarity: "epic", title: definition.title, description: definition.description },
      });

      newActivityEvents.push({
        id: `achievement_unlocked:${definition.id}`,
        type: "achievement_unlocked",
        createdAt: now,
        title: `Achievement: ${definition.title}`,
        sourceType: "achievement",
        sourceId: definition.id,
        metadata: { achievementId: rewardId, source: "quest_count" },
      });

      newBonusXpEvents.push({
        id: `achievement_xp:${definition.id}`,
        sourceType: "achievement",
        sourceId: definition.id,
        sourceTitle: definition.title,
        amount: definition.xpReward,
        attributeXp: [],
        createdAt: now,
      });

      celebrations.push({ kind: "achievement", intensity: "major", title: definition.title, description: definition.description, xpGained: definition.xpReward });
    }

    if (newActivityEvents.length > 0) {
      addActivityEvents(newActivityEvents);
    }

    if (newRewards.length > 0) {
      addRewards(newRewards);
    }

    if (newBonusXpEvents.length > 0) {
      addBonusXpEvents(newBonusXpEvents);
    }

    for (const celebration of celebrations) {
      enqueueCelebration(celebration);
    }

    initializedRef.current = true;
  }, [
    isReady,
    workoutSessionsLoaded,
    rewardCollectionLoaded,
    questDefinitions,
    questCompletions,
    activityEvents,
    attributes,
    workoutSessions,
    rewardCollection,
    progressionSummary,
    addActivityEvents,
    addRewards,
    addBonusXpEvents,
    enqueueCelebration,
  ]);
}
