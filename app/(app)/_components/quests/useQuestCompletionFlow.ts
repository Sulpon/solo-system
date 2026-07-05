"use client";

import { useCallback, useMemo, useState } from "react";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { calculateQuestAttributeXP } from "../../_lib/goal-tree-attributes";
import { getInheritedAttributeWeights } from "../../_lib/goal-tree-storage";
import type { QuestAttributeReward } from "../../_lib/types/quest";
import { useProgression } from "../../_lib/hooks/useProgression";

type QuestCompletionTarget = Readonly<{
  id: string;
  title: string;
  xp: number;
  linkedProgressGoalId?: string | null;
  attributeXPOverride?: ReadonlyArray<QuestAttributeReward>;
}>;

export function useQuestCompletionFlow() {
  const { setQuestCompletionForToday, hasQuestCompletedToday } = useProgression();
  const { goalTree, findNode, updateProgressGoal } = useGoalTree();
  const [pendingQuest, setPendingQuest] = useState<QuestCompletionTarget | null>(null);
  const [progressValue, setProgressValue] = useState("1");

  const pendingGoal = useMemo(() => {
    if (!pendingQuest?.linkedProgressGoalId) {
      return null;
    }

    return findNode(pendingQuest.linkedProgressGoalId);
  }, [findNode, pendingQuest]);

  const clearPending = useCallback(() => {
    setPendingQuest(null);
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
    (quest: QuestCompletionTarget) => {
      if (hasQuestCompletedToday(quest.id)) {
        return false;
      }

      if (quest.linkedProgressGoalId) {
        const linkedGoal = findNode(quest.linkedProgressGoalId);

        if (linkedGoal) {
          setPendingQuest(quest);
          setProgressValue("1");
          return true;
        }
      }

      setQuestCompletionForToday(quest.id, true, new Date().toISOString(), pendingAttributeRewards);
      return true;
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

    const completed = setQuestCompletionForToday(pendingQuest.id, true, new Date().toISOString(), pendingAttributeRewards);
    clearPending();
    return completed;
  }, [clearPending, pendingAttributeRewards, pendingGoal, pendingQuest, progressValue, setQuestCompletionForToday, updateProgressGoal]);

  const removeQuestCompletion = useCallback(
    (questId: string) => {
      setQuestCompletionForToday(questId, false);
    },
    [setQuestCompletionForToday],
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
  } as const;
}
