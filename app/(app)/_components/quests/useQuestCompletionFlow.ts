"use client";

import { useCallback, useMemo, useState } from "react";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { calculateQuestAttributeXP } from "../../_lib/goal-tree-attributes";
import { getInheritedAttributeWeights } from "../../_lib/goal-tree-storage";
import { createQuestReflection } from "../../_lib/quest-reflection-storage";
import { useQuestReflections } from "../../_lib/hooks/useQuestReflections";
import type { QuestAttributeReward } from "../../_lib/types/quest";
import type { ReflectionFeelingAfter, ReflectionHardest, ReflectionMood } from "../../_lib/types/reflection";
import { useProgression } from "../../_lib/hooks/useProgression";

type QuestCompletionTarget = Readonly<{
  id: string;
  title: string;
  xp: number;
  linkedProgressGoalId?: string | null;
  attributeXPOverride?: ReadonlyArray<QuestAttributeReward>;
}>;

type PendingReflectionQuest = Readonly<{ id: string; title: string; completedAt: string }>;

export type ReflectionSubmission = Readonly<{
  mood: ReflectionMood;
  hardest?: ReflectionHardest;
  hardestOtherNote?: string;
  feelingAfter?: ReflectionFeelingAfter;
  note?: string;
}>;

export function useQuestCompletionFlow() {
  const { setQuestCompletionForToday, hasQuestCompletedToday } = useProgression();
  const { goalTree, findNode, updateProgressGoal } = useGoalTree();
  const { setReflections } = useQuestReflections();
  const [pendingQuest, setPendingQuest] = useState<QuestCompletionTarget | null>(null);
  const [pendingCompletedAt, setPendingCompletedAt] = useState(() => new Date().toISOString());
  const [progressValue, setProgressValue] = useState("1");
  const [pendingReflectionQuest, setPendingReflectionQuest] = useState<PendingReflectionQuest | null>(null);

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

  const pendingAttributeRewards = useMemo(() => {
    if (!pendingQuest) {
      return [];
    }

    if (pendingQuest.attributeXPOverride && pendingQuest.attributeXPOverride.length > 0) {
      return pendingQuest.attributeXPOverride;
    }

    if (!pendingQuest.linkedProgressGoalId) {
      return [];
    }

    const inheritedWeights = getInheritedAttributeWeights(goalTree, pendingQuest.linkedProgressGoalId);
    return calculateQuestAttributeXP(pendingQuest.xp, inheritedWeights);
  }, [goalTree, pendingQuest]);

  const beginQuestCompletion = useCallback(
    (quest: QuestCompletionTarget, completedAt = new Date().toISOString()) => {
      if (hasQuestCompletedToday(quest.id, new Date(completedAt))) {
        return false;
      }

      if (quest.linkedProgressGoalId) {
        const linkedGoal = findNode(quest.linkedProgressGoalId);

        if (linkedGoal) {
          setPendingQuest(quest);
          setPendingCompletedAt(completedAt);
          setProgressValue("1");
          return true;
        }
      }

      const completed = setQuestCompletionForToday(quest.id, true, completedAt, pendingAttributeRewards);

      if (completed) {
        setPendingReflectionQuest({ id: quest.id, title: quest.title, completedAt });
      }

      return completed;
    },
    [findNode, hasQuestCompletedToday, pendingAttributeRewards, setQuestCompletionForToday],
  );

  const cancelQuestCompletion = useCallback(() => {
    clearPending();
  }, [clearPending]);

  const confirmQuestCompletion = useCallback(() => {
    if (!pendingQuest) {
      return false;
    }

    const increment = Number(progressValue);

    if (!Number.isFinite(increment) || increment < 0) {
      return false;
    }

    if (pendingGoal && pendingQuest.linkedProgressGoalId) {
      updateProgressGoal(pendingQuest.linkedProgressGoalId, increment);
    }

    const completed = setQuestCompletionForToday(pendingQuest.id, true, pendingCompletedAt, pendingAttributeRewards);

    if (completed) {
      setPendingReflectionQuest({ id: pendingQuest.id, title: pendingQuest.title, completedAt: pendingCompletedAt });
    }

    clearPending();
    return completed;
  }, [clearPending, pendingAttributeRewards, pendingCompletedAt, pendingGoal, pendingQuest, progressValue, setQuestCompletionForToday, updateProgressGoal]);

  const removeQuestCompletion = useCallback(
    (questId: string, completedAt = new Date().toISOString()) => {
      setQuestCompletionForToday(questId, false, completedAt);
    },
    [setQuestCompletionForToday],
  );

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
    removeQuestCompletion,
    hasQuestCompletedToday,
    pendingReflectionQuest,
    submitReflection,
    skipReflection,
  } as const;
}
