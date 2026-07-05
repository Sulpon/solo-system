"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import {
  adjustProgressGoalValue,
  completeSequentialMilestoneStep,
  collectProgressGoalNodes,
  createGoalNode,
  findGoalNode,
  insertGoalNode,
  removeGoalNode,
  normalizeGoalTree,
  undoSequentialMilestoneStep,
  updateGoalNode,
  type GoalNodeDraft,
} from "../goal-tree-storage";
import type { GoalNode, GoalTree } from "../types/goal-tree";
import type { XpEvent } from "../types/progression";
import { awardGoalTreeXpEvents } from "../goal-xp-ledger";
import { addActivityEvents, createGoalCompletionActivityEvents, createGoalXpActivityEvents, createProgressGoalUpdatedEvent } from "../activity-events";
import type { ActivityEvent } from "../types/activity-event";

export function useGoalTree() {
  const [goalTree, setGoalTree, hasLoaded, resetGoalTree] = useLocalStorageState<GoalTree>(STORAGE_KEYS.goalTree, []);
  const [goalXpEvents, setGoalXpEvents] = useLocalStorageState<ReadonlyArray<XpEvent>>(STORAGE_KEYS.goalXpEvents, []);
  const [, setActivityEvents] = useLocalStorageState<ActivityEvent[]>(STORAGE_KEYS.activityEvents, []);
  const goalTreeRef = useRef(goalTree);
  const goalXpEventsRef = useRef(goalXpEvents);

  useEffect(() => {
    goalTreeRef.current = goalTree;
  }, [goalTree]);

  useEffect(() => {
    goalXpEventsRef.current = goalXpEvents;
  }, [goalXpEvents]);

  const progressGoals = useMemo(() => collectProgressGoalNodes(goalTree), [goalTree]);

  const commitGoalTree = useCallback(
    (nextGoalTree: GoalTree) => {
      const previousTree = goalTreeRef.current;
      const createdAt = new Date().toISOString();
      const awarded = awardGoalTreeXpEvents(nextGoalTree, goalXpEventsRef.current, createdAt);
      const activityEvents = [...createGoalCompletionActivityEvents(previousTree, awarded.tree, createdAt), ...createGoalXpActivityEvents(awarded.awarded)];
      goalTreeRef.current = awarded.tree;
      goalXpEventsRef.current = awarded.events;
      setGoalTree(awarded.tree);
      setGoalXpEvents(awarded.events);
      setActivityEvents((current) => addActivityEvents(current, activityEvents));
      return awarded.tree;
    },
    [setActivityEvents, setGoalTree, setGoalXpEvents],
  );

  function createRootNode(draft: GoalNodeDraft) {
    commitGoalTree(normalizeGoalTree([...goalTreeRef.current, createGoalNode(draft)]));
  }

  function createChildNode(parentId: string | null | undefined, draft: GoalNodeDraft) {
    const nextNode = createGoalNode(draft);
    commitGoalTree(normalizeGoalTree(insertGoalNode(goalTreeRef.current, parentId, nextNode)));
  }

  function saveNode(nodeId: string, updater: (current: GoalNode) => GoalNode) {
    commitGoalTree(normalizeGoalTree(updateGoalNode(goalTreeRef.current, nodeId, updater)));
  }

  function deleteNode(nodeId: string) {
    commitGoalTree(normalizeGoalTree(removeGoalNode(goalTreeRef.current, nodeId)));
  }

  function updateProgressGoal(nodeId: string, increment: number) {
    const beforeNode = findGoalNode(goalTreeRef.current, nodeId);
    const nextTree = normalizeGoalTree(adjustProgressGoalValue(goalTreeRef.current, nodeId, increment));
    const afterNode = findGoalNode(nextTree, nodeId);
    const updatedTree = commitGoalTree(nextTree);

    if (beforeNode?.type === "progress_goal" && afterNode?.type === "progress_goal") {
      const updatedEvent = createProgressGoalUpdatedEvent({
        node: afterNode,
        oldValue: beforeNode.currentValue ?? 0,
        newValue: afterNode.currentValue ?? 0,
        createdAt: new Date().toISOString(),
      });

      if (updatedEvent) {
        setActivityEvents((current) => addActivityEvents(current, [updatedEvent]));
      }
    }

    return updatedTree;
  }

  function completeSequentialStep(nodeId: string) {
    commitGoalTree(normalizeGoalTree(completeSequentialMilestoneStep(goalTreeRef.current, nodeId)));
  }

  function undoSequentialStep(nodeId: string) {
    commitGoalTree(normalizeGoalTree(undoSequentialMilestoneStep(goalTreeRef.current, nodeId)));
  }

  function findNode(nodeId: string) {
    return findGoalNode(goalTree, nodeId);
  }

  return {
    goalTree,
    setGoalTree,
    hasLoaded,
    resetGoalTree,
    goalXpEvents,
    setGoalXpEvents,
    progressGoals,
    createRootNode,
    createChildNode,
    saveNode,
    deleteNode,
    updateProgressGoal,
    completeSequentialStep,
    undoSequentialStep,
    findNode,
  } as const;
}
