"use client";

import { useCallback, useMemo, useState } from "react";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useWorkoutSessions } from "../../_lib/hooks/useWorkoutSessions";
import { calculateQuestAttributeXP } from "../../_lib/goal-tree-attributes";
import { getInheritedAttributeWeights } from "../../_lib/goal-tree-storage";
import { getTrainingFrequency } from "../../_lib/engines/workout-engine";
import { createQuestReflection } from "../../_lib/quest-reflection-storage";
import { useQuestReflections } from "../../_lib/hooks/useQuestReflections";
import { getLocalDayKey } from "../../_lib/local-day";
import type { GoalTree } from "../../_lib/types/goal-tree";
import type { QuestAttributeReward, QuestCompletionMetricConfig, QuestGoalContribution } from "../../_lib/types/quest";
import type { ReflectionFeelingAfter, ReflectionHardest, ReflectionMood } from "../../_lib/types/reflection";
import { useProgression } from "../../_lib/hooks/useProgression";

type QuestCompletionTarget = Readonly<{
  id: string;
  title: string;
  xp: number;
  linkedProgressGoalId?: string | null;
  attributeXPOverride?: ReadonlyArray<QuestAttributeReward>;
  completionMetric?: QuestCompletionMetricConfig;
}>;

type PendingReflectionQuest = Readonly<{ id: string; title: string; completedAt: string }>;

type PendingUndo = Readonly<{
  questId: string;
  questTitle: string;
  completedAt: string;
  metricValue: number | null;
  unit: string | null;
  goalContribution: QuestGoalContribution | null;
  goalTitle: string | null;
  goalBefore: number | null;
  goalAfter: number | null;
  hasChallenge: boolean;
}>;

export type ReflectionSubmission = Readonly<{
  mood: ReflectionMood;
  hardest?: ReflectionHardest;
  hardestOtherNote?: string;
  feelingAfter?: ReflectionFeelingAfter;
  note?: string;
}>;

// A quest without explicit completionMetric config infers its type: numeric
// if it's linked to a goal (matches the historical behavior every existing
// linked quest has been exercised with for real completions), boolean
// otherwise (matches a plain "did I do it" habit). This keeps every
// pre-existing quest's *observed* prompting behavior identical - nothing
// changes until the user explicitly sets Completion Tracking on a quest.
function resolveMetricType(quest: QuestCompletionTarget): "boolean" | "numeric" {
  if (quest.completionMetric) {
    return quest.completionMetric.type;
  }

  return quest.linkedProgressGoalId ? "numeric" : "boolean";
}

function getAttributeRewardsForQuest(quest: QuestCompletionTarget, goalTree: GoalTree): QuestAttributeReward[] {
  if (quest.attributeXPOverride && quest.attributeXPOverride.length > 0) {
    return [...quest.attributeXPOverride];
  }

  if (!quest.linkedProgressGoalId) {
    return [];
  }

  const inheritedWeights = getInheritedAttributeWeights(goalTree, quest.linkedProgressGoalId);
  return calculateQuestAttributeXP(quest.xp, inheritedWeights);
}

export function useQuestCompletionFlow() {
  const { setQuestCompletionForToday, hasQuestCompletedToday, questDefinitions, questCompletions } = useProgression();
  const { goalTree, findNode, updateProgressGoal } = useGoalTree();
  const { sessions: workoutSessions } = useWorkoutSessions();
  const { setReflections } = useQuestReflections();
  const [pendingQuest, setPendingQuest] = useState<QuestCompletionTarget | null>(null);
  const [pendingCompletedAt, setPendingCompletedAt] = useState(() => new Date().toISOString());
  const [progressValue, setProgressValue] = useState("1");
  const [pendingReflectionQuest, setPendingReflectionQuest] = useState<PendingReflectionQuest | null>(null);
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);

  const pendingGoal = useMemo(() => {
    if (!pendingQuest?.linkedProgressGoalId) {
      return null;
    }

    return findNode(pendingQuest.linkedProgressGoalId);
  }, [findNode, pendingQuest]);

  const clearPending = useCallback(() => {
    setPendingQuest(null);
    setPendingCompletedAt(new Date().toISOString());
    setProgressValue("1");
  }, []);

  const completeImmediately = useCallback(
    (quest: QuestCompletionTarget, completedAt: string, metricValue: number) => {
      const goalContribution: QuestGoalContribution | null = quest.linkedProgressGoalId ? { goalId: quest.linkedProgressGoalId, amount: metricValue } : null;

      if (goalContribution) {
        updateProgressGoal(goalContribution.goalId, metricValue);
      }

      const completed = setQuestCompletionForToday(quest.id, true, completedAt, getAttributeRewardsForQuest(quest, goalTree), metricValue, goalContribution);

      if (completed) {
        setPendingReflectionQuest({ id: quest.id, title: quest.title, completedAt });
      }

      return completed;
    },
    [goalTree, setQuestCompletionForToday, updateProgressGoal],
  );

  const beginQuestCompletion = useCallback(
    (quest: QuestCompletionTarget, completedAt = new Date().toISOString()) => {
      if (hasQuestCompletedToday(quest.id, new Date(completedAt))) {
        return false;
      }

      const metricType = resolveMetricType(quest);

      if (metricType === "boolean") {
        return completeImmediately(quest, completedAt, 1);
      }

      if (quest.completionMetric?.autoSource === "workout-sessions") {
        const autoValue = getTrainingFrequency(workoutSessions, 1, new Date(completedAt));
        return completeImmediately(quest, completedAt, autoValue);
      }

      setPendingQuest(quest);
      setPendingCompletedAt(completedAt);
      setProgressValue("1");
      return true;
    },
    [completeImmediately, hasQuestCompletedToday, workoutSessions],
  );

  const cancelQuestCompletion = useCallback(() => {
    clearPending();
  }, [clearPending]);

  const confirmQuestCompletion = useCallback(() => {
    if (!pendingQuest) {
      return false;
    }

    const metricValue = Number(progressValue);

    if (!Number.isFinite(metricValue) || metricValue < 0) {
      return false;
    }

    const completed = completeImmediately(pendingQuest, pendingCompletedAt, metricValue);
    clearPending();
    return completed;
  }, [clearPending, completeImmediately, pendingCompletedAt, pendingQuest, progressValue]);

  const beginUndoCompletion = useCallback(
    (questId: string, completedAt = new Date().toISOString()) => {
      const quest = questDefinitions.find((item) => item.id === questId);
      const dayKey = getLocalDayKey(completedAt);
      const completion = questCompletions.find((item) => item.questId === questId && getLocalDayKey(item.completedAt) === dayKey);

      if (!quest || !completion) {
        return false;
      }

      const goalContribution = completion.goalContribution ?? null;
      let goalTitle: string | null = null;
      let goalBefore: number | null = null;
      let goalAfter: number | null = null;

      if (goalContribution) {
        const goal = findNode(goalContribution.goalId);

        if (goal) {
          goalTitle = goal.title;
          goalBefore = Math.max(0, Number(goal.currentValue ?? 0));
          goalAfter = Math.max(0, goalBefore - goalContribution.amount);
        }
      }

      setPendingUndo({
        questId,
        questTitle: quest.title,
        completedAt: completion.completedAt,
        metricValue: completion.metricValue ?? null,
        unit: quest.completionMetric?.unit ?? null,
        goalContribution,
        goalTitle,
        goalBefore,
        goalAfter,
        hasChallenge: Boolean(quest.challenge?.enabled),
      });
      return true;
    },
    [findNode, questCompletions, questDefinitions],
  );

  const cancelUndoCompletion = useCallback(() => {
    setPendingUndo(null);
  }, []);

  const confirmUndoCompletion = useCallback(() => {
    if (!pendingUndo) {
      return false;
    }

    if (pendingUndo.goalContribution) {
      updateProgressGoal(pendingUndo.goalContribution.goalId, -pendingUndo.goalContribution.amount);
    }

    const result = setQuestCompletionForToday(pendingUndo.questId, false, pendingUndo.completedAt);
    setPendingUndo(null);
    return result;
  }, [pendingUndo, setQuestCompletionForToday, updateProgressGoal]);

  const skipReflection = useCallback(() => {
    setPendingReflectionQuest(null);
  }, []);

  const submitReflection = useCallback(
    (input: ReflectionSubmission) => {
      if (!pendingReflectionQuest) {
        return;
      }

      const questCompletionId = `${pendingReflectionQuest.id}-${pendingReflectionQuest.completedAt}`;
      const reflection = createQuestReflection(pendingReflectionQuest.id, input, questCompletionId);
      setReflections((current) => [...current, reflection]);
      setPendingReflectionQuest(null);
    },
    [pendingReflectionQuest, setReflections],
  );

  return {
    pendingQuest,
    pendingGoal,
    progressValue,
    setProgressValue,
    beginQuestCompletion,
    confirmQuestCompletion,
    cancelQuestCompletion,
    hasQuestCompletedToday,
    pendingReflectionQuest,
    submitReflection,
    skipReflection,
    pendingUndo,
    beginUndoCompletion,
    confirmUndoCompletion,
    cancelUndoCompletion,
  } as const;
}
