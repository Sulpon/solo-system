"use client";

import { useMemo, useState } from "react";
import { useProgression } from "./useProgression";
import { createDailySnapshot } from "../daily-system";
import { createDailySnapshotSavedEvent } from "../activity-events";
import { getLocalDayKey } from "../local-day";

export function useNightReviewFlow() {
  const { questDefinitions, questCompletions, goalXpEvents, dailySnapshots, setDailySnapshots, addActivityEvents } = useProgression();
  const [reviewOpen, setReviewOpen] = useState(false);

  const todaySnapshot = useMemo(
    () =>
      createDailySnapshot({
        quests: questDefinitions,
        completions: questCompletions,
        goalXpEvents,
        existingSnapshot: dailySnapshots.find((snapshot) => snapshot.date === getLocalDayKey()) ?? null,
      }),
    [dailySnapshots, goalXpEvents, questCompletions, questDefinitions],
  );
  const alreadyReviewedToday = dailySnapshots.some((snapshot) => snapshot.date === todaySnapshot.date);

  function openReview() {
    setReviewOpen(true);
  }

  function closeReview() {
    setReviewOpen(false);
  }

  function finishReview(reflectionNote?: string) {
    const finalSnapshot = { ...todaySnapshot, reflectionNote: reflectionNote?.trim() || undefined };

    setDailySnapshots((current) => {
      const withoutToday = current.filter((snapshot) => snapshot.date !== finalSnapshot.date);
      return [...withoutToday, finalSnapshot].sort((first, second) => first.date.localeCompare(second.date));
    });
    addActivityEvents([createDailySnapshotSavedEvent(finalSnapshot)]);
    setReviewOpen(false);
  }

  return { reviewOpen, todaySnapshot, alreadyReviewedToday, openReview, closeReview, finishReview } as const;
}
