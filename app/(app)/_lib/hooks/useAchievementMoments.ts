"use client";

import { useMemo, useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { useAtlasContext } from "../atlas-context";
import { useGoalTree } from "./useGoalTree";
import { useProgression } from "./useProgression";
import { useNotes } from "./useNotes";
import { useLibrary } from "./useLibrary";
import { useAttributes } from "./useAttributes";
import { useFocusHistory } from "./useFocusHistory";
import { computeAchievementMoments } from "../achievements/achievement-moment-engine";
import { ACHIEVEMENT_MOMENTS_SEEN_KEY } from "../storage-keys";
import type { AchievementMoment } from "../achievements/types";

// Phase 12's React/data wiring seam - mirrors usePersonalIntelligence.ts's
// pattern exactly: gathers real data from each domain's existing hook,
// hands it to the pure achievement-moment-engine, and adds the one small
// piece of genuinely-required persistence (which moment ids this device has
// already shown - see ACHIEVEMENT_MOMENTS_SEEN_KEY).
export function useAchievementMoments(): Readonly<{
  moments: ReadonlyArray<AchievementMoment>;
  newMoments: ReadonlyArray<AchievementMoment>;
  markSeen: (ids: ReadonlyArray<string>) => void;
}> {
  const atlas = useAtlasContext();
  const { goalTree } = useGoalTree();
  const { questDefinitions, questCompletions, activityEvents } = useProgression();
  const { notes } = useNotes();
  const { items: libraryItems } = useLibrary();
  const { attributes } = useAttributes();
  const { history: focusHistory } = useFocusHistory();
  const [seenIds, setSeenIds] = useLocalStorageState<string[]>(ACHIEVEMENT_MOMENTS_SEEN_KEY, []);

  const moments = useMemo(
    () =>
      computeAchievementMoments({
        now: atlas.now,
        goalTree,
        quests: questDefinitions,
        completions: questCompletions,
        notes,
        libraryItems,
        attributes,
        focusHistory,
        activityEvents,
      }),
    [atlas.now, goalTree, questDefinitions, questCompletions, notes, libraryItems, attributes, focusHistory, activityEvents],
  );

  const seenSet = useMemo(() => new Set(seenIds), [seenIds]);
  const newMoments = useMemo(() => moments.filter((moment) => !seenSet.has(moment.id)), [moments, seenSet]);

  const markSeen = useCallback(
    (ids: ReadonlyArray<string>) => {
      if (ids.length === 0) return;
      setSeenIds((current) => Array.from(new Set([...current, ...ids])));
    },
    [setSeenIds],
  );

  return { moments, newMoments, markSeen };
}
